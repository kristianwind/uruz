"use client";

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

/** Client helpers for the passkey ceremony. Server routes do the verifying. */

export function passkeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

/** Register a passkey for the currently signed-in user. */
export async function registerPasskey(): Promise<boolean> {
  const optRes = await postJson("/api/auth/passkey/register/options");
  if (!optRes.ok) return false;
  const optionsJSON = await optRes.json();
  const response = await startRegistration({ optionsJSON });
  const verifyRes = await postJson("/api/auth/passkey/register/verify", { response });
  return verifyRes.ok;
}

/** Authenticate with a passkey for the given email. */
export async function loginWithPasskey(email: string): Promise<boolean> {
  const optRes = await postJson("/api/auth/passkey/login/options", { email });
  if (!optRes.ok) return false;
  const optionsJSON = await optRes.json();
  const response = await startAuthentication({ optionsJSON });
  const verifyRes = await postJson("/api/auth/passkey/login/verify", { email, response });
  return verifyRes.ok;
}
