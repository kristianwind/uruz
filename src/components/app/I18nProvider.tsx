"use client";

import { createContext, useContext, useMemo } from "react";
import { createT, DEFAULT_LOCALE, type Locale, type TFunction } from "@/lib/i18n/core";

/**
 * Locale for client components. The provider sits high in the app shell and is
 * fed the signed-in user's language preference from the server, so there is no
 * flash of the wrong language and no client-side locale fetch.
 */

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Translator bound to the active locale. */
export function useT(): TFunction {
  const locale = useContext(LocaleContext);
  return useMemo(() => createT(locale), [locale]);
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
