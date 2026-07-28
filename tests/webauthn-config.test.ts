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
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { rpConfig } = await load();
    expect((await rpConfig()).rpID).toBe("uruz.example.dk");
  });

  it("does not fall back to localhost on a real domain", async () => {
    // The original bug: every deployment was broken until someone set the var.
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { rpConfig } = await load();
    expect((await rpConfig()).rpID).not.toBe("localhost");
  });

  it("honours an explicit RP ID, for sharing across subdomains", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "example.dk";
    const { rpConfig } = await load();
    expect((await rpConfig()).rpID).toBe("example.dk");
  });

  it("discards a stale override that cannot work for this origin", async () => {
    // Exactly the state a server created from rune v1 ends up in: the old
    // default "localhost" is stored in the server's env and would otherwise
    // survive both a new image and a new rune.
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "localhost";
    const { rpConfig } = await load();
    expect((await rpConfig()).rpID).toBe("uruz.example.dk");
  });

  it("ignores an RP ID that is only whitespace", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "   ";
    const { rpConfig } = await load();
    expect((await rpConfig()).rpID).toBe("uruz.example.dk");
  });

  it("still works for local development", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.WEBAUTHN_RP_ID;
    const { rpConfig } = await load();
    expect((await rpConfig()).rpID).toBe("localhost");
  });
});

describe("checkWebAuthnConfig", () => {
  it("accepts a matching https host", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { checkWebAuthnConfig } = await load();
    expect(await checkWebAuthnConfig()).toMatchObject({ valid: true, problem: null });
  });

  it("accepts a registrable parent domain as the RP ID", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "example.dk";
    const { checkWebAuthnConfig } = await load();
    expect((await checkWebAuthnConfig()).valid).toBe(true);
  });

  it("ignores an unusable RP ID rather than guaranteeing a failure", async () => {
    // A stale "localhost" from an older default is the common case. Honouring
    // it could only ever fail in the browser, so the derived host wins and the
    // panel says the override was ignored.
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    process.env.WEBAUTHN_RP_ID = "localhost";
    const { checkWebAuthnConfig } = await load();
    expect(await checkWebAuthnConfig()).toMatchObject({
      valid: true,
      rpID: "uruz.example.dk",
      problem: "rp_id_override_ignored",
    });
  });

  it("ignores a lookalike domain rather than matching on substring", async () => {
    // "notexample.dk" ends with "example.dk" as a *string* but is a different
    // registrable domain; only a dot-boundary match is legitimate.
    process.env.NEXT_PUBLIC_APP_URL = "https://notexample.dk";
    process.env.WEBAUTHN_RP_ID = "example.dk";
    const { checkWebAuthnConfig } = await load();
    expect((await checkWebAuthnConfig()).rpID).toBe("notexample.dk");
  });

  it("flags plain http on a real domain", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://uruz.example.dk";
    delete process.env.WEBAUTHN_RP_ID;
    const { checkWebAuthnConfig } = await load();
    expect(await checkWebAuthnConfig()).toMatchObject({
      valid: false,
      problem: "not_secure_context",
    });
  });

  it("allows http on localhost, which browsers treat as secure", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.WEBAUTHN_RP_ID;
    const { checkWebAuthnConfig } = await load();
    expect((await checkWebAuthnConfig()).valid).toBe(true);
  });

  it("reports a malformed app URL instead of throwing", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "uruz.example.dk";
    const { checkWebAuthnConfig } = await load();
    expect(await checkWebAuthnConfig()).toMatchObject({
      valid: false,
      problem: "app_url_invalid",
    });
  });
});
