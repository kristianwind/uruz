import "server-only";
import { cookies } from "next/headers";
import { createT, DEFAULT_LOCALE, isLocale, type Locale, type TFunction } from "./core";

/**
 * Locale resolution for server components.
 *
 * Order of preference:
 *   1. the signed-in user's saved preference (passed in by the caller, which
 *      already has the user loaded — avoids a second query per component)
 *   2. the `uruz-locale` cookie, so the choice also applies before sign-in
 *   3. the default locale
 */

export const LOCALE_COOKIE = "uruz-locale";

export async function getLocale(userLocale?: string | null): Promise<Locale> {
  if (isLocale(userLocale)) return userLocale;
  try {
    const store = await cookies();
    const fromCookie = store.get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    // No request scope (the built-in scheduler calls through here) — there is
    // no cookie to consult, so the default is the honest answer.
  }
  return DEFAULT_LOCALE;
}

/** Translator for a server component. */
export async function getT(userLocale?: string | null): Promise<TFunction> {
  return createT(await getLocale(userLocale));
}
