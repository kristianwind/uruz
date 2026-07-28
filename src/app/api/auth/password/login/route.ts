import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail } from "@/lib/db/repo/users";
import { getPasswordHash } from "@/lib/db/repo/auth";
import { verifyPassword } from "@/lib/auth/password";
import { signIn } from "@/lib/auth/cookies";
import { loginLimiter, clientKey } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(1024),
});

/**
 * Sign in with a password — the fallback for whoever cannot use a passkey.
 *
 * Every failure looks identical from the outside: unknown email, no password
 * set, wrong password and deactivated account all return the same 401. Telling
 * them apart would let a stranger enumerate who trains here.
 *
 * Attempts are counted per email *and* per caller address, so neither one
 * account nor one machine can be used to grind through guesses. A successful
 * sign-in clears both counters.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const emailKey = `pw:email:${email}`;
  const addressKey = `pw:addr:${clientKey(req)}`;

  const blocked = [loginLimiter.check(emailKey), loginLimiter.check(addressKey)].find(
    (d) => !d.allowed,
  );
  if (blocked) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: Math.ceil(blocked.retryAfterMs / 1000) },
      { status: 429, headers: { "retry-after": String(Math.ceil(blocked.retryAfterMs / 1000)) } },
    );
  }

  const user = getUserByEmail(email);
  const hash = user ? getPasswordHash(user.id) : null;

  // Hash even when there is nothing to compare against. Returning early would
  // make "no such user" measurably faster than "wrong password", which is the
  // same disclosure the identical error messages above are there to prevent.
  const ok = await verifyPassword(parsed.data.password, hash ?? NO_SUCH_USER_HASH);

  if (!ok || !user || !user.isActive) {
    loginLimiter.fail(emailKey);
    loginLimiter.fail(addressKey);
    return NextResponse.json({ error: "failed" }, { status: 401 });
  }

  loginLimiter.reset(emailKey);
  loginLimiter.reset(addressKey);
  await signIn(user.id);
  return NextResponse.json({ ok: true });
}

/**
 * A syntactically valid hash that no password matches, used to spend the same
 * work on an unknown email as on a real one. The salt and digest are constant
 * because nothing is being protected here — only the timing.
 */
const NO_SUCH_USER_HASH = [
  "scrypt",
  65536,
  8,
  1,
  Buffer.alloc(16).toString("base64"),
  Buffer.alloc(64).toString("base64"),
].join("$");
