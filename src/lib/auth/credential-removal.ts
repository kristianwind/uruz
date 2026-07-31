/**
 * May this passkey be removed?
 *
 * A pure decision, kept apart from the route so it can be reasoned about and
 * tested without a database — the one rule here is the difference between
 * tidying up and locking yourself out of your own training log.
 *
 * Yggdrasil, where this feature was copied from, has no such rule: there every
 * account has a password, so removing every passkey can never strand anyone.
 * Uruz cannot assume that. It has three ways in, and *none* of them is
 * guaranteed to be available:
 *
 *   - a passkey — which is what is being removed
 *   - a password — optional, and most people will not have set one
 *   - a sign-in link by email — which is not a way in at all when no mail
 *     server is configured, because the link is only written to the server log
 *
 * That last one is the trap worth naming. "We can always email you" is false
 * on an installation that has never been given a mail server, and an interface
 * that counts it anyway will cheerfully remove somebody's last key.
 */

export type RemovalRefusal = "not_found" | "last_way_in";

export interface RemovalContext {
  /** How many passkeys the account has, including the one being removed. */
  credentialCount: number;
  /** True when the account has a password set. */
  hasPassword: boolean;
  /** True when mail actually leaves the server — not merely "email exists". */
  canSendEmail: boolean;
}

export interface RemovalDecision {
  allowed: boolean;
  refusal?: RemovalRefusal;
}

/**
 * Is a session recent enough to count as proof of presence on its own?
 *
 * The re-authentication requirement exists because an *old* session is not
 * proof of anything — a phone left unlocked on a bench. A session opened
 * minutes ago is different: whoever holds it just passed the front door
 * (passkey, password or e-mail link). Counting that as presence is what
 * breaks the trap where an account's only passkey is broken *and* has no
 * password — sign in with a fresh e-mail link, and the dead key can go.
 */
export const FRESH_SESSION_MS = 10 * 60 * 1000;

export function sessionIsFresh(
  createdAtIso: string | null,
  nowMs: number,
  windowMs: number = FRESH_SESSION_MS,
): boolean {
  if (!createdAtIso) return false;
  const created = new Date(createdAtIso).getTime();
  if (Number.isNaN(created)) return false;
  // A creation time in the future is a broken clock, not proof of presence.
  if (created > nowMs) return false;
  return nowMs - created <= windowMs;
}

export function canRemoveCredential(ctx: RemovalContext): RemovalDecision {
  if (ctx.credentialCount <= 0) return { allowed: false, refusal: "not_found" };

  // Removing one of several always leaves the others.
  if (ctx.credentialCount > 1) return { allowed: true };

  // The last one may only go if something else can still let you back in.
  if (ctx.hasPassword || ctx.canSendEmail) return { allowed: true };

  return { allowed: false, refusal: "last_way_in" };
}
