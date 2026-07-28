import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the data layer at a throwaway database BEFORE importing it.
const dir = mkdtempSync(join(tmpdir(), "uruz-pw-test-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");

const { getDb, closeDb } = await import("@/lib/db/sqlite");
const { createHall } = await import("@/lib/db/repo/halls");
const { createUser } = await import("@/lib/db/repo/users");
const {
  setPasswordHash,
  getPasswordHash,
  hasPassword,
  clearPassword,
  createMagicToken,
  consumeMagicToken,
} = await import("@/lib/db/repo/auth");

/**
 * Passwords are stored apart from the user row, and the one-time links that
 * can replace them are told apart by purpose. Both are easy to get subtly
 * wrong in a way no one notices until someone is locked out — or let in.
 */

let userId = "";

beforeEach(() => {
  const db = getDb();
  for (const table of ["user_passwords", "magic_tokens", "users", "halls"]) {
    db.exec(`DELETE FROM ${table}`);
  }
  const hall = createHall("Testhal");
  userId = createUser({ hallId: hall.id, email: "ib@example.dk", displayName: "Ib" }).id;
});

afterAll(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("password storage", () => {
  it("reads back what was written", () => {
    setPasswordHash(userId, "scrypt$1$2$3$c2FsdA==$aGFzaA==");
    expect(getPasswordHash(userId)).toBe("scrypt$1$2$3$c2FsdA==$aGFzaA==");
    expect(hasPassword(userId)).toBe(true);
  });

  it("has nothing for a user who never set one", () => {
    expect(getPasswordHash(userId)).toBeNull();
    expect(hasPassword(userId)).toBe(false);
  });

  it("replaces rather than accumulates on a change", () => {
    setPasswordHash(userId, "first");
    setPasswordHash(userId, "second");
    expect(getPasswordHash(userId)).toBe("second");
    const rows = getDb()
      .prepare("SELECT COUNT(*) AS n FROM user_passwords WHERE user_id = ?")
      .get(userId) as { n: number };
    expect(Number(rows.n)).toBe(1);
  });

  it("forgets it on removal", () => {
    setPasswordHash(userId, "first");
    clearPassword(userId);
    expect(hasPassword(userId)).toBe(false);
  });

  it("goes away with the user", () => {
    // A deleted account must not leave its credential behind.
    setPasswordHash(userId, "first");
    getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
    expect(getPasswordHash(userId)).toBeNull();
  });
});

describe("consumeMagicToken", () => {
  it("spends a token once", () => {
    const token = createMagicToken("ib@example.dk", "login");
    expect(consumeMagicToken(token, "login")?.email).toBe("ib@example.dk");
    expect(consumeMagicToken(token, "login")).toBeNull();
  });

  it("will not let a reset link be spent as a sign-in link", () => {
    // Otherwise the careful flow could always be traded for the looser one.
    const token = createMagicToken("ib@example.dk", "reset");
    expect(consumeMagicToken(token, "login")).toBeNull();
  });

  it("leaves a token unspent when the purpose does not match", () => {
    const token = createMagicToken("ib@example.dk", "reset");
    consumeMagicToken(token, "login");
    expect(consumeMagicToken(token, "reset")?.email).toBe("ib@example.dk");
  });

  it("rejects an expired token", () => {
    const token = createMagicToken("ib@example.dk", "reset");
    getDb()
      .prepare("UPDATE magic_tokens SET expires_at = ? WHERE token = ?")
      .run(new Date(Date.now() - 1000).toISOString(), token);
    expect(consumeMagicToken(token, "reset")).toBeNull();
  });

  it("rejects a token that was never issued", () => {
    expect(consumeMagicToken("made-up", "reset")).toBeNull();
  });
});
