import { describe, it, expect, afterEach } from "vitest";

/**
 * Which way mail leaves the app is decided by what happens to be configured.
 * Getting that precedence wrong is silent: mail simply goes somewhere the
 * operator did not intend, or nowhere at all.
 */

const ORIGINAL = { ...process.env };

async function load() {
  return import("@/lib/notify/email");
}

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("emailProvider", () => {
  it("uses SMTP when a mail server is configured", async () => {
    process.env.SMTP_HOST = "smtp.example.dk";
    delete process.env.RESEND_API_KEY;
    const { emailProvider } = await load();
    expect(emailProvider()).toBe("smtp");
  });

  it("prefers SMTP over Resend when both are set", async () => {
    // Entering a mail server is deliberate work; a leftover API key is not.
    process.env.SMTP_HOST = "smtp.example.dk";
    process.env.RESEND_API_KEY = "re_test";
    const { emailProvider } = await load();
    expect(emailProvider()).toBe("smtp");
  });

  it("falls back to Resend when there is no mail server", async () => {
    delete process.env.SMTP_HOST;
    process.env.RESEND_API_KEY = "re_test";
    const { emailProvider } = await load();
    expect(emailProvider()).toBe("resend");
  });

  it("logs to the console when nothing is configured", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    const { emailProvider } = await load();
    expect(emailProvider()).toBe("dev");
  });

  it("treats a blank value as unconfigured", async () => {
    // An empty variable is what a rune with an empty default leaves behind.
    process.env.SMTP_HOST = "   ";
    process.env.RESEND_API_KEY = "";
    const { emailProvider } = await load();
    expect(emailProvider()).toBe("dev");
  });
});
