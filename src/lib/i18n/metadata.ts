import "server-only";
import type { Metadata } from "next";
import { getT } from "./server";

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
 * itself renders in.
 */
export function localizedTitle(key: string): () => Promise<Metadata> {
  return async () => {
    const t = await getT();
    return { title: t(key) };
  };
}
