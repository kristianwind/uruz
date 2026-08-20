import "server-only";
import type { Metadata } from "next";
import { getT } from "./server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Page titles that follow the reader's language.
 *
 * They used to be Danish string literals in each page's `metadata` export —
 * invisible in the app itself, but the browser tab, the history entry and the
 * name of a home-screen bookmark all come from there. With English as the
 * default that would have left seventeen Danish words in an otherwise English
 * app.
 *
 * `generateMetadata` is async, so it can resolve the same locale the page
 * itself renders in — including the signed-in user's own preference. Reading
 * only the cookie was not enough: a Dane whose preference is stored on their
 * account, with no cookie set, got an English tab above a Danish page.
 */
export function localizedTitle(key: string): () => Promise<Metadata> {
  return async () => {
    // Unauthenticated pages (welcome, login) have no preference to read, and
    // getT falls back to the cookie and then the default.
    const user = await getCurrentUser().catch(() => null);
    const t = await getT(user?.localePref);
    return { title: t(key) };
  };
}
