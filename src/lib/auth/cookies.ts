import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session";
import { createSession, deleteSession } from "@/lib/db/repo/auth";

/** Issue a fresh session for the user and set the httpOnly session cookie. */
export async function signIn(userId: string): Promise<void> {
  const { token, expiresAt } = createSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Clear the current session (this device). */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  store.delete(SESSION_COOKIE);
}
