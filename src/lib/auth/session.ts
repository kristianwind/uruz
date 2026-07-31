import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/sqlite";
import { getUser } from "@/lib/db/repo/users";
import { getAnyHall } from "@/lib/db/repo/halls";
import type { Hall, User } from "@/lib/domain/types";
import type { Row } from "@/lib/db/sqlite";

/**
 * Auth session resolution.
 *
 * This is the single seam the rest of the app uses to learn "who is the current
 * user". It reads an opaque session token from an httpOnly cookie and looks it
 * up in `auth_sessions`. Phase 2 issues those tokens via passkey / magic-link.
 *
 * To keep local development frictionless, if there is no session cookie but a
 * demo user exists AND URUZ_DEV_AUTOLOGIN is on (default in dev), we fall back
 * to the first admin. This never triggers in production.
 */

export const SESSION_COOKIE = "uruz_session";

const devAutologin =
  process.env.URUZ_DEV_AUTOLOGIN !== "false" && process.env.NODE_ENV !== "production";

function userIdForToken(token: string): string | null {
  const row = getDb()
    .prepare("SELECT user_id, expires_at FROM auth_sessions WHERE token = ?")
    .get(token) as Row | undefined;
  if (!row) return null;
  if (new Date(String(row.expires_at)).getTime() < Date.now()) return null;
  return String(row.user_id);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const uid = userIdForToken(token);
    if (uid) return getUser(uid);
  }
  if (devAutologin) {
    const row = getDb()
      .prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY created_at LIMIT 1")
      .get() as Row | undefined;
    if (row) return getUser(String(row.id));
  }
  return null;
}

export interface AppContext {
  user: User;
  hall: Hall;
}

/** Resolve user + hall, or null when unauthenticated. */
export async function getContext(): Promise<AppContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const hall = getAnyHall();
  if (!hall) return null;
  return { user, hall };
}

/** Like getContext but throws when unauthenticated — for pages behind auth. */
export async function requireContext(): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) throw new Error("UNAUTHENTICATED");
  return ctx;
}

/**
 * When the current session was opened, or null when there is no real session
 * row (dev autologin has none). Lets sensitive routes treat a just-opened
 * session as proof of presence — see `sessionIsFresh` in credential-removal.
 */
export async function getSessionCreatedAt(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare("SELECT created_at FROM auth_sessions WHERE token = ?")
    .get(token) as Row | undefined;
  return row ? String(row.created_at) : null;
}
