import { describe, it, expect } from "vitest";
import { createRateLimiter, clientKey } from "@/lib/auth/rate-limit";

/**
 * The throttle is the only thing standing between a password and an unlimited
 * number of guesses, so its edges matter: it has to block at the right count,
 * forgive at the right time, and never lock out someone who just signed in.
 */

/** A limiter with a clock the test drives by hand. */
function limiterAt(limit: number, windowMs: number) {
  let clock = 1_000_000;
  const limiter = createRateLimiter({ limit, windowMs, now: () => clock });
  return {
    limiter,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows attempts up to the limit and refuses the next one", () => {
    const { limiter } = limiterAt(3, 60_000);
    expect(limiter.fail("a").allowed).toBe(true);
    expect(limiter.fail("a").allowed).toBe(true);
    expect(limiter.fail("a").allowed).toBe(false);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("counts each key separately", () => {
    const { limiter } = limiterAt(1, 60_000);
    limiter.fail("a");
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("forgives attempts once the window has passed", () => {
    const { limiter, advance } = limiterAt(2, 60_000);
    limiter.fail("a");
    limiter.fail("a");
    expect(limiter.check("a").allowed).toBe(false);
    advance(60_001);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("slides rather than resetting wholesale", () => {
    // Two failures a minute apart: the first ages out on its own, the second
    // is still counted. A fixed window would have cleared both.
    const { limiter, advance } = limiterAt(2, 60_000);
    limiter.fail("a");
    advance(59_000);
    limiter.fail("a");
    expect(limiter.check("a").allowed).toBe(false);
    advance(2_000); // first attempt is now outside the window, second is not
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").remaining).toBe(1);
  });

  it("reports how long to wait", () => {
    const { limiter, advance } = limiterAt(1, 60_000);
    limiter.fail("a");
    advance(20_000);
    expect(limiter.check("a").retryAfterMs).toBe(40_000);
  });

  it("clears the count on success", () => {
    const { limiter } = limiterAt(2, 60_000);
    limiter.fail("a");
    limiter.fail("a");
    expect(limiter.check("a").allowed).toBe(false);
    limiter.reset("a");
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("does not count a check as an attempt", () => {
    const { limiter } = limiterAt(1, 60_000);
    limiter.check("a");
    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("keeps the tracked-key count bounded under a flood of distinct keys", () => {
    // A stranger can invent unlimited email addresses; memory must not follow.
    const { limiter } = limiterAt(5, 60_000);
    const bounded = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 10 });
    for (let i = 0; i < 500; i++) bounded.fail(`user${i}@example.dk`);
    // The most recent key is still counted; the old ones were dropped.
    expect(bounded.check("user499@example.dk").remaining).toBe(4);
    expect(limiter.check("untouched").allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the original client from a proxy chain", () => {
    const req = new Request("https://uruz.example.dk/", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(req)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("https://uruz.example.dk/", {
      headers: { "x-real-ip": "203.0.113.7" },
    });
    expect(clientKey(req)).toBe("203.0.113.7");
  });

  it("collapses to one bucket when no proxy says who called", () => {
    const req = new Request("https://uruz.example.dk/");
    expect(clientKey(req)).toBe("unknown");
  });
});
