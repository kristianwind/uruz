import "server-only";
import { headers } from "next/headers";

/**
 * Where the app actually lives, as a public URL.
 *
 * `NEXT_PUBLIC_APP_URL` is the configured answer and always wins when it is
 * set to something real. But it defaults to localhost, and a deployment where
 * nobody changed it is silently broken in ways that are hard to trace: magic
 * links point at localhost, and the passkey RP ID derives from it too.
 *
 * So when the configuration still says localhost while the request plainly did
 * not come from localhost, the request itself is the better source of truth.
 * Behind Nginx Proxy Manager or a Cloudflare Tunnel the real public host
 * arrives in `x-forwarded-host` / `x-forwarded-proto`.
 *
 * Configuration first, request second, localhost last.
 */

const DEFAULT_ORIGIN = "http://localhost:3000";

function isLocal(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/** The configured origin, or null when it is absent or still the default. */
export function configuredOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // Treat the shipped default as "not configured" so a real request can win.
    if (isLocal(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Resolve the public origin for this request.
 *
 * Trusting forwarded headers is a considered trade-off: it is what makes a
 * self-hosted deployment behind a proxy work without hand-configuration, and
 * the operator controls that proxy. An explicitly configured origin always
 * takes precedence, so an installation that cares can pin it.
 */
export async function getAppOrigin(): Promise<string> {
  const configured = configuredOrigin();
  if (configured) return configured;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host && !isLocal(host.split(":")[0])) {
      // A proxy chain sends a comma-separated list; the first entry is the client-facing one.
      const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
      return `${proto}://${host.split(",")[0].trim()}`;
    }
    if (host) return `http://${host}`;
  } catch {
    // Outside a request context (a cron job, a script) — fall through.
  }

  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_ORIGIN;
}

/** Hostname of the resolved origin, used as the passkey relying-party ID. */
export async function getAppHost(): Promise<string> {
  try {
    return new URL(await getAppOrigin()).hostname;
  } catch {
    return "localhost";
  }
}

/** True when the deployment is relying on the request rather than configuration. */
export function originIsInferred(): boolean {
  return configuredOrigin() === null;
}
