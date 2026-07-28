import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";

/**
 * Password handling is the one place where a subtle bug is a security bug, so
 * the properties that matter are pinned explicitly.
 */

describe("hashPassword", () => {
  it("never stores the password itself", async () => {
    const hash = await hashPassword("korrekt hestebatteri hæfteklamme");
    expect(hash).not.toContain("korrekt");
    expect(hash).not.toContain("hestebatteri");
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("det samme kodeord");
    const b = await hashPassword("det samme kodeord");
    expect(a).not.toBe(b);
  });

  it("records its parameters so they can be raised later", async () => {
    const hash = await hashPassword("et eller andet kodeord");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash.split("$")).toHaveLength(6);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    const hash = await hashPassword("min hemmelige sætning");
    expect(await verifyPassword("min hemmelige sætning", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("min hemmelige sætning");
    expect(await verifyPassword("min hemmelige sætnin", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("is case sensitive", async () => {
    const hash = await hashPassword("Store Og Små Bogstaver");
    expect(await verifyPassword("store og små bogstaver", hash)).toBe(false);
  });

  it("handles non-ASCII consistently", async () => {
    const hash = await hashPassword("blåbærgrød med fløde");
    expect(await verifyPassword("blåbærgrød med fløde", hash)).toBe(true);
  });

  it("treats a corrupt hash as a wrong password rather than throwing", async () => {
    for (const bad of ["", "nonsense", "scrypt$1$2$3", "scrypt$a$b$c$d$e", "bcrypt$1$8$1$x$y"]) {
      await expect(verifyPassword("hvad som helst", bad)).resolves.toBe(false);
    }
  });

  it("does not accept a hash produced for a different password", async () => {
    const a = await hashPassword("kodeord nummer et");
    expect(await verifyPassword("kodeord nummer to", a)).toBe(false);
  });
});

describe("checkPasswordStrength", () => {
  it("requires a reasonable length", () => {
    expect(checkPasswordStrength("kort").ok).toBe(false);
    expect(checkPasswordStrength("kort").problem).toBe("too_short");
    expect(checkPasswordStrength("x".repeat(MIN_PASSWORD_LENGTH - 1)).ok).toBe(false);
  });

  it("accepts a long passphrase without demanding symbols", () => {
    // Length beats character-class rules; forcing symbols produces Password1!
    expect(checkPasswordStrength("tre gule ænder på en sø").ok).toBe(true);
  });

  it("rejects passwords from every breach list", () => {
    expect(checkPasswordStrength("password123").problem).toBe("too_common");
    expect(checkPasswordStrength("qwertyuiop").problem).toBe("too_common");
  });

  it("rejects a long but near-empty password", () => {
    expect(checkPasswordStrength("aaaaaaaaaaaaaaa").problem).toBe("too_simple");
  });

  it("ignores surrounding whitespace when measuring", () => {
    expect(checkPasswordStrength("   kort   ").problem).toBe("too_short");
  });
});
