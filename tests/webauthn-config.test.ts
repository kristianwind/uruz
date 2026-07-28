import { describe, it, expect, afterEach } from "vitest";

/**
 * The RP ID rules are easy to get subtly wrong and impossible to notice: the
 * browser rejects a bad one locally, so the server never sees a failure. These
 * tests pin the behaviour that a real deployment depends on.
 */

const ORIGINAL = { ...process.env };

async function load() {
  // The module reads process.env at call time, but re-import to be safe.
  const mod = await import("@/lib/auth/webauthn");
  return mod;
}

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("rpConfig", () => {
  it("derives the RP ID from the app URL when none is set", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.yggdrasilpanel.com";
    delete process.env.WEBAUTHN_RP_ID;
    const { rpConfig } = await load();
    expect(rpConfig().rpID).toBe("uruz.yggdrasilpanel.com");
  });

  it("does not fall back to localhost on a real domain", async () => {
    // The original bug: every deployment was broken until someone set the var.
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { rpConfig } = await load();
    expect(rpConfig().rpID).not.toBe("localhost");
  });

  it("honours an explicit RP ID, for sharing across subdomains", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "example.dk";
    const { rpConfig } = await load();
    expect(rpConfig().rpID).toBe("example.dk");
  });

  it("ignores an RP ID that is only whitespace", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "   ";
    const { rpConfig } = await load();
    expect(rpConfig().rpID).toBe("uruz.example.dk");
  });

  it("still works for local development", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.WEBAUTHN_RP_ID;
    const { rpConfig } = await load();
    expect(rpConfig().rpID).toBe("localhost");
  });
});

describe("checkWebAuthnConfig", () => {
  it("accepts a matching https host", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig()).toMatchObject({ valid: true, problem: null });
  });

  it("accepts a registrable parent domain as the RP ID", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "example.dk";
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig().valid).toBe(true);
  });

  it("flags an RP ID that is not a suffix of the host", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "localhost";
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig()).toMatchObject({
      valid: false,
      problem: "rp_id_mismatch",
    });
  });

  it("rejects a lookalike domain rather than matching on substring", async () => {
    // "notexample.dk" ends with "example.dk" as a *string* but is a different
    // registrable domain; only a dot-boundary match is legitimate.
    process.env.NEXT_PUBLIC_APP_URL = "https://notexample.dk";
    process.env.WEBAUTHN_RP_ID = "example.dk";
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig().valid).toBe(false);
  });

  it("flags plain http on a real domain", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig()).toMatchObject({
      valid: false,
      problem: "not_secure_context",
    });
  });

  it("allows http on localhost, which browsers treat as secure", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.WEBAUTHN_RP_ID;
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig().valid).toBe(true);
  });

  it("reports a malformed app URL instead of throwing", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "uruz.example.dk";
    const { checkWebAuthnConfig } = await load();
    expect(checkWebAuthnConfig()).toMatchObject({
      valid: false,
      problem: "app_url_invalid",
    });
  });
});
