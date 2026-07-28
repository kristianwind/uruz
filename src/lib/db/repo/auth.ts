import { getDb, newId, nowIso, type Row } from "../sqlite";

/**
 * Auth-related persistence: WebAuthn credentials + challenges, opaque server
 * sessions, and one-time magic-link tokens. Kept in one module because they
 * share a lifecycle and never surface in the domain UI.
 */

// ---- Credentials (passkeys) ---------------------------------------------

export interface StoredCredential {
  id: string; // credential id (base64url)
  userId: string;
  publicKey: string; // base64url
  counter: number;
  transports: string[];
}

export function addCredential(c: StoredCredential): void {
  getDb()
    .prepare(
      `INSERT INTO credentials (id, user_id, kind, public_key, counter, transports, created_at)
       VALUES (?,?,?,?,?,?,?)`,
    )
    .run(
      c.id,
      c.userId,
      "passkey",
      c.publicKey,
      c.counter,
      JSON.stringify(c.transports ?? []),
      nowIso(),
    );
}

export function getCredential(id: string): StoredCredential | null {
  const row = getDb().prepare("SELECT * FROM credentials WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    publicKey: String(row.public_key),
    counter: Number(row.counter),
    transports: row.transports ? JSON.parse(String(row.transports)) : [],
  };
}

export function listUserCredentials(userId: string): StoredCredential[] {
  const rows = getDb()
    .prepare("SELECT * FROM credentials WHERE user_id = ?")
    .all(userId) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    publicKey: String(row.public_key),
    counter: Number(row.counter),
    transports: row.transports ? JSON.parse(String(row.transports)) : [],
  }));
}

export function updateCredentialCounter(id: string, counter: number): void {
  getDb().prepare("UPDATE credentials SET counter = ? WHERE id = ?").run(counter, id);
}

// ---- WebAuthn challenges (short-lived) -----------------------------------

export function saveChallenge(key: string, challenge: string): void {
  const db = getDb();
  db.prepare("DELETE FROM webauthn_challenges WHERE key = ?").run(key);
  db.prepare(
    "INSERT INTO webauthn_challenges (id, key, challenge, created_at) VALUES (?,?,?,?)",
  ).run(newId(), key, challenge, nowIso());
}

export function takeChallenge(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT challenge FROM webauthn_challenges WHERE key = ?").get(key) as
    | Row
    | undefined;
  db.prepare("DELETE FROM webauthn_challenges WHERE key = ?").run(key);
  return row ? String(row.challenge) : null;
}

// ---- Sessions ------------------------------------------------------------

const SESSION_TTL_DAYS = 30;

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = newId() + newId().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000).toISOString();
  getDb()
    .prepare("INSERT INTO auth_sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)")
    .run(token, userId, nowIso(), expiresAt);
  return { token, expiresAt };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}

export function deleteAllUserSessions(userId: string): void {
  getDb().prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(userId);
}

// ---- Passwords -----------------------------------------------------------
// Stored apart from the user row on purpose — see the note in schema.sqlite.ts.
// Nothing here hashes or compares; that is @/lib/auth/password.

export function setPasswordHash(userId: string, hash: string): void {
  getDb()
    .prepare(
      `INSERT INTO user_passwords (user_id, hash, updated_at) VALUES (?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET hash = excluded.hash, updated_at = excluded.updated_at`,
    )
    .run(userId, hash, nowIso());
}

export function getPasswordHash(userId: string): string | null {
  const row = getDb()
    .prepare("SELECT hash FROM user_passwords WHERE user_id = ?")
    .get(userId) as Row | undefined;
  return row ? String(row.hash) : null;
}

export function hasPassword(userId: string): boolean {
  return getPasswordHash(userId) !== null;
}

export function clearPassword(userId: string): void {
  getDb().prepare("DELETE FROM user_passwords WHERE user_id = ?").run(userId);
}

// ---- Magic tokens --------------------------------------------------------

const MAGIC_TTL_MIN = 30;

export function createMagicToken(email: string, purpose = "login"): string {
  const token = newId().replace(/-/g, "") + newId().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + MAGIC_TTL_MIN * 60_000).toISOString();
  getDb()
    .prepare(
      "INSERT INTO magic_tokens (token, email, purpose, created_at, expires_at) VALUES (?,?,?,?,?)",
    )
    .run(token, email.toLowerCase(), purpose, nowIso(), expiresAt);
  return token;
}

export interface MagicToken {
  token: string;
  email: string;
  purpose: string;
  expiresAt: string;
  usedAt: string | null;
}

/**
 * Spend a one-time token, if it is still spendable.
 *
 * `expectedPurpose` keeps the flows apart: a link e-mailed for choosing a new
 * password must not also work as a sign-in link, or the more careful flow
 * could always be traded for the looser one. A mismatch leaves the token
 * untouched rather than burning it.
 */
export function consumeMagicToken(token: string, expectedPurpose?: string): MagicToken | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM magic_tokens WHERE token = ?").get(token) as Row | undefined;
  if (!row) return null;
  const mt: MagicToken = {
    token: String(row.token),
    email: String(row.email),
    purpose: String(row.purpose),
    expiresAt: String(row.expires_at),
    usedAt: row.used_at ? String(row.used_at) : null,
  };
  if (expectedPurpose && mt.purpose !== expectedPurpose) return null;
  if (mt.usedAt || new Date(mt.expiresAt).getTime() < Date.now()) return null;
  db.prepare("UPDATE magic_tokens SET used_at = ? WHERE token = ?").run(nowIso(), token);
  return mt;
}
