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

/**
 * Passkey (WebAuthn) ceremony helpers, wrapping @simplewebauthn v13.
 *
 * Relying-party config comes from env so the same code works on localhost and
 * in production. Challenges are persisted server-side (single-use) keyed by the
 * flow subject (email for login, userId for registration).
 */

function rpConfig() {
  const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
  const rpName = process.env.WEBAUTHN_RP_NAME || "Uruz";
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { rpID, rpName, origin };
}

// ---- Registration --------------------------------------------------------

export async function registrationOptions(userId: string, email: string) {
  const { rpID, rpName } = rpConfig();
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
  const { rpID, origin } = rpConfig();
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
  const { rpID } = rpConfig();
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
  const { rpID, origin } = rpConfig();
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
