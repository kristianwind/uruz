import { describe, it, expect } from "vitest";
import { magicLinkEmail, passwordResetEmail, inviteEmail } from "@/lib/notify/email";

/**
 * A page rendering in English before anyone has said otherwise is a reasonable
 * default. Writing to a named person in a language they did not choose is not —
 * so these messages follow the recipient, not the app.
 */

const LINK = "https://uruz.example.dk/api/auth/magic/callback?token=abc";

describe("email templates", () => {
  it("writes in the recipient's language, not the default", () => {
    expect(magicLinkEmail(LINK, "da").subject).toContain("login-link");
    expect(magicLinkEmail(LINK, "en").subject).toContain("sign-in link");
  });

  it("falls back to the default when no language is known", () => {
    // An invitation goes to someone with no account, so there is nothing to
    // follow — English is what a stranger is most likely to read.
    expect(inviteEmail(LINK, "Min hal").subject).toContain("invited");
  });

  it("carries the link into both the text and the html part", () => {
    for (const locale of ["da", "en"] as const) {
      const mail = magicLinkEmail(LINK, locale);
      expect(mail.text).toContain(LINK);
      expect(mail.html).toContain(LINK);
    }
  });

  it("puts the hall's name in the invitation, in both languages", () => {
    for (const locale of ["da", "en"] as const) {
      const mail = inviteEmail(LINK, "Jernhallen", locale);
      expect(mail.subject).toContain("Jernhallen");
      expect(mail.text).toContain("Jernhallen");
      expect(mail.html).toContain("Jernhallen");
    }
  });

  it("leaves no untranslated key in any message", () => {
    // t() returns the key itself when a string is missing, so a stray dot in
    // the output is how a forgotten translation shows up.
    for (const locale of ["da", "en"] as const) {
      for (const mail of [
        magicLinkEmail(LINK, locale),
        passwordResetEmail(LINK, locale),
        inviteEmail(LINK, "Jernhallen", locale),
      ]) {
        expect(mail.subject).not.toMatch(/^email\./);
        expect(mail.text).not.toMatch(/email\.[a-zA-Z]+/);
        expect(mail.html).not.toMatch(/email\.[a-zA-Z]+/);
      }
    }
  });
});
