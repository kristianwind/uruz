import "server-only";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import {
  addCredential,
  getCredential,
  listUserCredentials,
  saveChallenge,
  takeChallenge,
  updateCredentialCounter,
} from "@/lib/db/repo/auth";
import { getAppOrigin, originIsInferred } from "./origin";

/**
 * Passkey (WebAuthn) ceremony helpers, wrapping @simplewebauthn v13.
 *
 * Relying-party config comes from env so the same code works on localhost and
 * in production. Challenges are persisted server-side (single-use) keyed by the
 * flow subject (email for login, userId for registration).
 */

/**
 * Relying-party configuration for passkeys.
 *
 * The RP ID must be the origin's registrable domain — a browser refuses to
 * create a credential when it isn't, which surfaces to the user as a bare
 * "something went wrong". So it is *derived* from the app URL by default and
 * only overridden when WEBAUTHN_RP_ID is set deliberately (for instance to a
 * parent domain, so one credential covers several subdomains).
 *
 * Defaulting it to "localhost" — as this once did — meant every real
 * deployment was broken until someone happened to set the right variable.
 * The origin now comes from `getAppOrigin()`, which falls back to the request
 * itself, so a deployment behind a proxy works even unconfigured.
 */
export async function rpConfig() {
  const origin = await getAppOrigin();
  const rpName = process.env.WEBAUTHN_RP_NAME || "Uruz";

  let derivedHost = "localhost";
  try {
    derivedHost = new URL(origin).hostname;
  } catch {
    // Malformed NEXT_PUBLIC_APP_URL — fall through to the default and let the
    // health/diagnostic surface report it rather than crashing a sign-in.
  }

  const configured = process.env.WEBAUTHN_RP_ID?.trim();

  // An RP ID that isn't the origin's host — or a registrable parent of it — is
  // rejected by every browser, so honouring it would only produce a guaranteed
  // failure. A stale "localhost" left behind by an old default is the common
  // case. Prefer the value that can actually work, and let the admin panel
  // report that the override was ignored.
  const usable =
    !!configured && (configured === derivedHost || derivedHost.endsWith(`.${configured}`));

  return { rpID: usable ? configured : derivedHost, rpName, origin };
}

/** True when WEBAUTHN_RP_ID is set to something unusable and is being ignored. */
export async function rpIdOverrideIgnored(): Promise<boolean> {
  const configured = process.env.WEBAUTHN_RP_ID?.trim();
  if (!configured) return false;
  return configured !== (await rpConfig()).rpID;
}

export interface WebAuthnDiagnostics {
  origin: string;
  rpID: string;
  /** True when the RP ID can actually work for this origin. */
  valid: boolean;
  problem: string | null;
  /** True when the origin came from the request rather than configuration. */
  inferred: boolean;
}

/**
 * Explain whether the current configuration can work, for the admin panel.
 * A passkey failure is otherwise invisible: the browser rejects it locally and
 * the server never hears about it.
 */
export async function checkWebAuthnConfig(): Promise<WebAuthnDiagnostics> {
  const { origin, rpID } = await rpConfig();
  const inferred = originIsInferred();

  let host: string | null = null;
  let secure = false;
  try {
    const url = new URL(origin);
    host = url.hostname;
    // WebAuthn requires a secure context; localhost is the sanctioned exception.
    secure = url.protocol === "https:" || host === "localhost" || host === "127.0.0.1";
  } catch {
    return { origin, rpID, valid: false, problem: "app_url_invalid", inferred };
  }

  // rpConfig() already discards an unusable override, so a mismatch here would
  // mean a bug rather than misconfiguration — check anyway, cheaply.
  const matches = host === rpID || host.endsWith(`.${rpID}`);
  if (!matches) return { origin, rpID, valid: false, problem: "rp_id_mismatch", inferred };
  if (!secure) return { origin, rpID, valid: false, problem: "not_secure_context", inferred };

  // Works, but the operator set something that could not be used. Say so, so a
  // stale value gets cleaned up instead of quietly lingering.
  if (await rpIdOverrideIgnored()) {
    return { origin, rpID, valid: true, problem: "rp_id_override_ignored", inferred };
  }

  return { origin, rpID, valid: true, problem: null, inferred };
}

// ---- Registration --------------------------------------------------------

export async function registrationOptions(userId: string, email: string) {
  const { rpID, rpName } = await rpConfig();
  const existing = listUserCredentials(userId);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: email,
    userID: isoUint8Array.fromUTF8String(userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransportLike[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
  saveChallenge(`reg:${userId}`, options.challenge);
  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
): Promise<boolean> {
  const { rpID, origin } = await rpConfig();
  const expectedChallenge = takeChallenge(`reg:${userId}`);
  if (!expectedChallenge) return false;

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return false;
  }
  if (!verification.verified || !verification.registrationInfo) return false;

  const { credential } = verification.registrationInfo;
  addCredential({
    id: credential.id,
    userId,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: (credential.transports ?? []) as string[],
  });
  return true;
}

// ---- Authentication ------------------------------------------------------

export async function authenticationOptions(subjectKey: string, userId: string | null) {
  const { rpID } = await rpConfig();
  const creds = userId ? listUserCredentials(userId) : [];
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransportLike[],
    })),
    userVerification: "preferred",
  });
  saveChallenge(`auth:${subjectKey}`, options.challenge);
  return options;
}

/** Returns the userId of the authenticated credential, or null on failure. */
export async function verifyAuthentication(
  subjectKey: string,
  response: AuthenticationResponseJSON,
): Promise<string | null> {
  const { rpID, origin } = await rpConfig();
  const expectedChallenge = takeChallenge(`auth:${subjectKey}`);
  if (!expectedChallenge) return null;

  const cred = getCredential(response.id);
  if (!cred) return null;

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.id,
        publicKey: isoBase64URL.toBuffer(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports as AuthenticatorTransportLike[],
      },
    });
  } catch {
    return null;
  }
  if (!verification.verified) return null;
  updateCredentialCounter(cred.id, verification.authenticationInfo.newCounter);
  return cred.userId;
}

// The library's transport union; kept local to avoid leaking the dependency.
type AuthenticatorTransportLike =
  | "ble"
  | "cable"
  | "hybrid"
  | "internal"
  | "nfc"
  | "smart-card"
  | "usb";
