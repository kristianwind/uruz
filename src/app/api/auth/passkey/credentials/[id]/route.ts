import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext, getSessionCreatedAt } from "@/lib/auth/session";
import {
  countUserCredentials,
  deleteCredential,
  renameCredential,
  getPasswordHash,
  deleteAllUserSessions,
} from "@/lib/db/repo/auth";
import { verifyPassword } from "@/lib/auth/password";
import { verifyAuthentication } from "@/lib/auth/webauthn";
import { canRemoveCredential, sessionIsFresh } from "@/lib/auth/credential-removal";
import { emailProvider } from "@/lib/notify/email";
import { signIn } from "@/lib/auth/cookies";
import { loginLimiter, clientKey } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  /** Proof of presence: the account password, when one is set. */
  currentPassword: z.string().max(1024).optional(),
  /** Or a fresh passkey assertion, for accounts with no password. */
  assertion: z.unknown().optional(),
});

/**
 * Remove one of your own passkeys.
 *
 * Three things this does that the implementation it was modelled on does not,
 * each of them a hole rather than a difference of taste:
 *
 * 1. **It asks who you are again.** A live session is not proof: a phone left
 *    unlocked on a bench should not be a route to stripping its owner's keys.
 *    This is the same reason changing a password requires the old one — a
 *    passkey is the same kind of key. One exception: a session opened within
 *    the last few minutes *is* recent proof of presence (whoever holds it just
 *    came through the front door), so it counts on its own. Without that, an
 *    account whose only passkey is broken and has no password could never be
 *    rid of the dead key — the fresh-login window is how it escapes: sign in
 *    with an e-mail link, remove the key straight away.
 * 2. **It refuses to remove your last way in.** See `credential-removal`.
 * 3. **It ends the sessions the key opened.** Removing a key because a device
 *    was lost is pointless if that device's session keeps working. We do not
 *    track which session came from which credential, so every session goes and
 *    this one is re-issued — the person doing the removing stays signed in
 *    here, and nowhere else.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Guessing the password here deserves the same ceiling as guessing it at the
  // front door.
  const limitKey = `pkdel:${ctx.user.id}:${clientKey(req)}`;
  const blocked = loginLimiter.check(limitKey);
  if (!blocked.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: Math.ceil(blocked.retryAfterMs / 1000) },
      { status: 429 },
    );
  }

  const hash = getPasswordHash(ctx.user.id);

  // The refusal comes before the challenge: being told "this is your only way
  // in" after authenticating is a pointless ceremony, and it reveals nothing
  // the signed-in owner does not already know about their own account.
  const decision = canRemoveCredential({
    credentialCount: countUserCredentials(ctx.user.id),
    hasPassword: !!hash,
    // "We can always email you" is false when nothing can send mail.
    canSendEmail: emailProvider() !== "dev",
  });
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.refusal }, { status: 409 });
  }

  // A session opened minutes ago is itself recent proof of presence; only
  // older sessions have to prove it again with a password or a key.
  let reauthenticated = sessionIsFresh(await getSessionCreatedAt(), Date.now());

  if (!reauthenticated && hash && parsed.data.currentPassword) {
    reauthenticated = await verifyPassword(parsed.data.currentPassword, hash);
  }
  if (!reauthenticated && parsed.data.assertion) {
    // A malformed assertion is a failed re-authentication, not a server error.
    try {
      reauthenticated =
        (await verifyAuthentication(ctx.user.email, parsed.data.assertion as never)) ===
        ctx.user.id;
    } catch {
      reauthenticated = false;
    }
  }

  if (!reauthenticated) {
    // Only an actual wrong guess spends an attempt. A bare probe — the client
    // asking "is my session fresh enough?" with nothing attached — guessed at
    // nothing and learns nothing, so it must not eat into the budget of
    // someone who then has to type their real password.
    if (parsed.data.currentPassword || parsed.data.assertion) {
      loginLimiter.fail(limitKey);
    }
    return NextResponse.json({ error: "reauth_required" }, { status: 403 });
  }
  loginLimiter.reset(limitKey);

  // Ownership lives in the WHERE clause, so a foreign id simply matches nothing.
  if (!deleteCredential(id, ctx.user.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  deleteAllUserSessions(ctx.user.id);
  await signIn(ctx.user.id);

  return NextResponse.json({ ok: true, remaining: countUserCredentials(ctx.user.id) });
}

const RenameBody = z.object({ name: z.string().trim().max(60) });

/** Rename a key. A list of identical rows is a list nobody can act on. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const parsed = RenameBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (!renameCredential(id, ctx.user.id, parsed.data.name)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
