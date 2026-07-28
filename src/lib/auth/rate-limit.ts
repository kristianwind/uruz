/**
 * Attempt throttling for the endpoints where guessing is the attack.
 *
 * Passkeys cannot be brute-forced; a password can, so the moment passwords
 * exist the login route needs a ceiling on how fast someone may try. This is
 * that ceiling, and nothing else — no bans, no captcha, no lockout that a
 * stranger could trigger against a real user's account permanently.
 *
 * State is in memory. Uruz runs as a single container against a single SQLite
 * file, so there is exactly one process to count in; a horizontally scaled
 * deployment would need this moved to the database. That is a real limit and
 * worth knowing before scaling out, not a bug.
 *
 * The window slides: attempts are timestamps, and each check drops the ones
 * that have aged out. Deliberately failure-counting — a successful sign-in
 * calls `reset`, so ordinary use never approaches the limit.
 *
 * `now` is injectable so the behaviour is testable without waiting for wall
 * clock time to pass.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** How long until the caller may try again; 0 when allowed. */
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  /** Failures allowed inside the window before refusing. */
  limit: number;
  windowMs: number;
  /** Injectable clock, for tests. */
  now?: () => number;
  /**
   * Cap on tracked keys, so a flood of distinct emails cannot grow the map
   * without bound. Oldest-touched keys are dropped first; dropping one only
   * forgives attempts, it never blocks anyone who wasn't blocked already.
   */
  maxKeys?: number;
}

export interface RateLimiter {
  /** Would an attempt be allowed right now? Does not consume anything. */
  check(key: string): RateLimitDecision;
  /** Record one failed attempt and report the state after it. */
  fail(key: string): RateLimitDecision;
  /** Forget a key — call on success, so normal use never accumulates. */
  reset(key: string): void;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 10_000;

  // key -> failure timestamps, oldest first. Map preserves insertion order,
  // which is what makes the oldest-first eviction below cheap.
  const attempts = new Map<string, number[]>();

  function live(key: string): number[] {
    const cutoff = now() - windowMs;
    const kept = (attempts.get(key) ?? []).filter((t) => t > cutoff);
    if (kept.length === 0) attempts.delete(key);
    else attempts.set(key, kept);
    return kept;
  }

  function decide(kept: number[]): RateLimitDecision {
    const remaining = Math.max(0, limit - kept.length);
    if (remaining > 0) return { allowed: true, remaining, retryAfterMs: 0 };
    // Blocked until the oldest attempt in the window ages out.
    const oldest = kept[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now()),
    };
  }

  function evictIfCrowded(): void {
    if (attempts.size <= maxKeys) return;
    const cutoff = now() - windowMs;
    for (const [key, times] of attempts) {
      if (times.length === 0 || times[times.length - 1] <= cutoff) attempts.delete(key);
    }
    // Still crowded after dropping the expired ones: drop oldest-touched first.
    while (attempts.size > maxKeys) {
      const oldestKey = attempts.keys().next().value;
      if (oldestKey === undefined) break;
      attempts.delete(oldestKey);
    }
  }

  return {
    check(key) {
      return decide(live(key));
    },
    fail(key) {
      const kept = live(key);
      kept.push(now());
      attempts.set(key, kept);
      evictIfCrowded();
      return decide(kept);
    },
    reset(key) {
      attempts.delete(key);
    },
  };
}

/**
 * The limiter the sign-in routes share.
 *
 * Five failures per quarter of an hour: slow enough that guessing a password
 * of the required length is hopeless, loose enough that someone typing their
 * own password wrong a few times is not locked out of their own training log.
 */
export const loginLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

/**
 * The client address, as far as it can be trusted.
 *
 * Behind the reverse proxy this app is deployed behind, the client address
 * arrives in `x-forwarded-for`; the first entry is the original client. Where
 * no proxy sets it there is nothing to read, and every request looks like the
 * same caller — so this is only ever *one* of the keys attempts are counted
 * under, never the only one.
 */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
