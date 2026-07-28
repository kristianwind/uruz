import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing with scrypt from Node's own crypto module.
 *
 * scrypt is deliberately memory-hard, which is what makes a stolen hash
 * expensive to attack — and it ships with Node, so this adds no dependency and
 * no native build step, matching how the rest of the app is built.
 *
 * Stored format: `scrypt$N$r$p$<salt-b64>$<hash-b64>`. The parameters travel
 * with the hash, so they can be raised later without invalidating existing
 * passwords: an old hash still verifies against its own recorded cost.
 */

// ~64 MB of memory per hash. Comfortably slow for an attacker, ~100ms here.
const PARAMS = { N: 2 ** 16, r: 8, p: 1 };
const KEYLEN = 64;
const SALT_BYTES = 16;
// scrypt needs headroom above N*r*128; the default 32MB cap is too low for N=2^16.
const MAXMEM = 256 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordCheck {
  ok: boolean;
  problem?: "too_short" | "too_common" | "too_simple";
}

/**
 * Reject the passwords that actually get broken, without theatre.
 *
 * Length does far more work than character-class rules, so the bar is a
 * reasonable minimum length plus a check against the handful of passwords that
 * appear in every breach list. No forced symbols — those push people toward
 * `Password1!` and a sticky note.
 */
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passwordpassword",
  "12345678", "123456789", "1234567890", "qwertyuiop", "qwerty123",
  "iloveyou", "adminadmin", "letmein123", "welcome123", "administrator",
  "kodeord123", "adgangskode", "hemmelighed",
]);

export function checkPasswordStrength(password: string): PasswordCheck {
  const value = password.trim();
  if (value.length < MIN_PASSWORD_LENGTH) return { ok: false, problem: "too_short" };
  if (COMMON.has(value.toLowerCase())) return { ok: false, problem: "too_common" };
  // A single repeated character is long but worthless.
  if (new Set(value).size < 4) return { ok: false, problem: "too_simple" };
  return { ok: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    ...PARAMS,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Verify a password against a stored hash.
 *
 * Never throws on a malformed hash — a corrupt row must read as "wrong
 * password", not as a crash that reveals something happened.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAXMEM,
    });
    // Constant-time: a length-dependent early return would leak information.
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
