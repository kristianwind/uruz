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

export function consumeMagicToken(token: string): MagicToken | null {
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
  if (mt.usedAt || new Date(mt.expiresAt).getTime() < Date.now()) return null;
  db.prepare("UPDATE magic_tokens SET used_at = ? WHERE token = ?").run(nowIso(), token);
  return mt;
}
