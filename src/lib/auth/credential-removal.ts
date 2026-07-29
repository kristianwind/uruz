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

export function canRemoveCredential(ctx: RemovalContext): RemovalDecision {
  if (ctx.credentialCount <= 0) return { allowed: false, refusal: "not_found" };

  // Removing one of several always leaves the others.
  if (ctx.credentialCount > 1) return { allowed: true };

  // The last one may only go if something else can still let you back in.
  if (ctx.hasPassword || ctx.canSendEmail) return { allowed: true };

  return { allowed: false, refusal: "last_way_in" };
}
