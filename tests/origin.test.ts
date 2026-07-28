import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Where the app thinks it lives decides two things that fail invisibly: the
 * link in a sign-in e-mail, and the passkey RP ID. A deployment where nobody
 * set NEXT_PUBLIC_APP_URL used to get localhost for both, so these tests pin
 * that the request itself can rescue it — and that configuration still wins.
 */

const ORIGINAL = { ...process.env };

// The header bag the mocked `headers()` returns; each test sets it.
let requestHeaders = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => requestHeaders.get(name.toLowerCase()) ?? null,
  }),
}));

function request(entries: Record<string, string>) {
  requestHeaders = new Map(Object.entries(entries));
}

/** No request context at all — a cron job, a script, a build step. */
function noRequest() {
  requestHeaders = new Map();
}

async function load() {
  return import("@/lib/auth/origin");
}

afterEach(() => {
  process.env = { ...ORIGINAL };
  noRequest();
});

describe("getAppOrigin", () => {
  it("uses the configured URL when it points somewhere real", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.yggdrasilpanel.com";
    request({ "x-forwarded-host": "elsewhere.example.dk", "x-forwarded-proto": "https" });
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("https://uruz.yggdrasilpanel.com");
  });

  it("falls back to the request when the configuration still says localhost", async () => {
    // Exactly the broken state: the rune default was never changed.
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    request({ "x-forwarded-host": "uruz.yggdrasilpanel.com", "x-forwarded-proto": "https" });
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("https://uruz.yggdrasilpanel.com");
  });

  it("uses the request when nothing is configured at all", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    request({ "x-forwarded-host": "uruz.example.dk", "x-forwarded-proto": "https" });
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("https://uruz.example.dk");
  });

  it("falls back to the plain Host header when there is no proxy", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    request({ host: "uruz.example.dk" });
    const { getAppOrigin } = await load();
    // Without x-forwarded-proto, https is the safer assumption for a real host.
    expect(await getAppOrigin()).toBe("https://uruz.example.dk");
  });

  it("takes the first entry of a proxy chain", async () => {
    // Several proxies append to the same header; the client-facing one is first.
    delete process.env.NEXT_PUBLIC_APP_URL;
    request({
      "x-forwarded-host": "uruz.example.dk, internal.lan",
      "x-forwarded-proto": "https, http",
    });
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("https://uruz.example.dk");
  });

  it("keeps working for local development", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    request({ host: "localhost:3000" });
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("http://localhost:3000");
  });

  it("falls back to the default outside any request", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    noRequest();
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("http://localhost:3000");
  });

  it("ignores a malformed configured URL in favour of the request", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "uruz.example.dk";
    request({ "x-forwarded-host": "uruz.yggdrasilpanel.com", "x-forwarded-proto": "https" });
    const { getAppOrigin } = await load();
    expect(await getAppOrigin()).toBe("https://uruz.yggdrasilpanel.com");
  });
});

describe("getAppHost", () => {
  it("is the hostname without port or scheme, for use as the RP ID", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    request({ "x-forwarded-host": "uruz.example.dk:8443", "x-forwarded-proto": "https" });
    const { getAppHost } = await load();
    expect(await getAppHost()).toBe("uruz.example.dk");
  });
});

describe("originIsInferred", () => {
  it("is true when the configuration is absent or still localhost", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const { originIsInferred } = await load();
    expect(originIsInferred()).toBe(true);
  });

  it("is false once a real address is configured", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://uruz.example.dk";
    const { originIsInferred } = await load();
    expect(originIsInferred()).toBe(false);
  });
});
