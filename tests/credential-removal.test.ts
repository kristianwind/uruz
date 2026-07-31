import { describe, it, expect } from "vitest";
import {
  canRemoveCredential,
  sessionIsFresh,
  FRESH_SESSION_MS,
} from "@/lib/auth/credential-removal";

/**
 * The rule that stands between tidying up and being locked out of your own
 * training log. Every case here is a way somebody could end up stranded.
 */

describe("canRemoveCredential", () => {
  it("allows removing one of several", () => {
    const d = canRemoveCredential({ credentialCount: 3, hasPassword: false, canSendEmail: false });
    expect(d.allowed).toBe(true);
  });

  it("allows removing the last one when a password is set", () => {
    const d = canRemoveCredential({ credentialCount: 1, hasPassword: true, canSendEmail: false });
    expect(d.allowed).toBe(true);
  });

  it("allows removing the last one when mail actually works", () => {
    const d = canRemoveCredential({ credentialCount: 1, hasPassword: false, canSendEmail: true });
    expect(d.allowed).toBe(true);
  });

  it("refuses to remove the last way in", () => {
    // No password, no mail server: the sign-in link would only be written to
    // the server log, which is not a way back in for the person locked out.
    const d = canRemoveCredential({ credentialCount: 1, hasPassword: false, canSendEmail: false });
    expect(d).toEqual({ allowed: false, refusal: "last_way_in" });
  });

  it("reports nothing to remove when the account has no passkeys", () => {
    const d = canRemoveCredential({ credentialCount: 0, hasPassword: true, canSendEmail: true });
    expect(d).toEqual({ allowed: false, refusal: "not_found" });
  });

  it("does not treat a configured mailbox as a password", () => {
    // Both are ways in, but they are not interchangeable: this pins that the
    // rule is "at least one", never "a password specifically".
    expect(
      canRemoveCredential({ credentialCount: 1, hasPassword: false, canSendEmail: true }).allowed,
    ).toBe(true);
    expect(
      canRemoveCredential({ credentialCount: 1, hasPassword: true, canSendEmail: false }).allowed,
    ).toBe(true);
  });
});

describe("sessionIsFresh", () => {
  const now = Date.parse("2026-07-31T12:00:00.000Z");
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  it("counts a just-opened session as fresh", () => {
    expect(sessionIsFresh(minutesAgo(1), now)).toBe(true);
  });

  it("counts a session at the edge of the window as fresh", () => {
    expect(sessionIsFresh(new Date(now - FRESH_SESSION_MS).toISOString(), now)).toBe(true);
  });

  it("rejects an older session — the phone on the bench", () => {
    expect(sessionIsFresh(minutesAgo(11), now)).toBe(false);
    expect(sessionIsFresh(minutesAgo(60 * 24), now)).toBe(false);
  });

  it("rejects when there is no session row to date", () => {
    // Dev autologin has no auth_sessions row; that must not count as presence.
    expect(sessionIsFresh(null, now)).toBe(false);
  });

  it("rejects garbage and future timestamps", () => {
    expect(sessionIsFresh("not a date", now)).toBe(false);
    expect(sessionIsFresh(minutesAgo(-5), now)).toBe(false);
  });
});
