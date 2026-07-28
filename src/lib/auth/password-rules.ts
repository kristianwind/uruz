/**
 * What counts as an acceptable password.
 *
 * Separate from `./password` — which hashes, and is server-only — precisely so
 * the sign-up form can apply the very same rule before it posts. One rule, both
 * sides: the browser can then say "too short" immediately, and the server still
 * decides, because a client check is a courtesy and never a control.
 */

export const MIN_PASSWORD_LENGTH = 10;

export type PasswordProblem = "too_short" | "too_common" | "too_simple";

export interface PasswordCheck {
  ok: boolean;
  problem?: PasswordProblem;
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
