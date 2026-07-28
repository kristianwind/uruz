import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import {
  getPasswordHash,
  setPasswordHash,
  clearPassword,
  deleteAllUserSessions,
} from "@/lib/db/repo/auth";
import { hashPassword, verifyPassword, checkPasswordStrength } from "@/lib/auth/password";
import { signIn } from "@/lib/auth/cookies";
import { loginLimiter, clientKey } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  password: z.string().max(1024).optional(),
  /** Required when a password is already set — proves this is not a borrowed session. */
  currentPassword: z.string().max(1024).optional(),
  /** Set instead of `password` to remove the password entirely. */
  remove: z.boolean().optional(),
});

/**
 * Set, change or remove one's own password.
 *
 * Requires the current password when one exists. A live session is not enough:
 * a phone left unlocked on a bench should not be a route to locking its owner
 * out of their own account. Guessing the current password here is throttled
 * for the same reason it is on the login route.
 *
 * Changing it ends every other session. If the reason for changing was that
 * someone else knows the old one, leaving their session alive would undo the
 * point of changing it.
 */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const existing = getPasswordHash(ctx.user.id);
  const limitKey = `pwset:${ctx.user.id}:${clientKey(req)}`;

  if (existing) {
    const blocked = loginLimiter.check(limitKey);
    if (!blocked.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterSeconds: Math.ceil(blocked.retryAfterMs / 1000) },
        { status: 429 },
      );
    }
    const current = parsed.data.currentPassword ?? "";
    if (!(await verifyPassword(current, existing))) {
      loginLimiter.fail(limitKey);
      return NextResponse.json({ error: "wrong_current" }, { status: 403 });
    }
    loginLimiter.reset(limitKey);
  }

  if (parsed.data.remove) {
    clearPassword(ctx.user.id);
    return NextResponse.json({ ok: true, hasPassword: false });
  }

  const password = parsed.data.password ?? "";
  const strength = checkPasswordStrength(password);
  if (!strength.ok) {
    return NextResponse.json({ error: "weak", problem: strength.problem }, { status: 400 });
  }

  setPasswordHash(ctx.user.id, await hashPassword(password));

  // Every session goes, including this one — then a fresh one is issued here,
  // so the person doing the changing stays signed in on this device only.
  deleteAllUserSessions(ctx.user.id);
  await signIn(ctx.user.id);

  return NextResponse.json({ ok: true, hasPassword: true });
}
