import da from "@locales/da.json";
import en from "@locales/en.json";

/**
 * Minimal, dependency-free i18n.
 *
 * Every user-facing string resolves through a `t()` bound to a locale, so
 * adding a language is a matter of dropping in another JSON file and listing it
 * here — no component churn.
 *
 * Server components get their `t` from `@/lib/i18n/server`; client components
 * use the `useT()` hook from `@/components/app/I18nProvider`. Both end up here.
 */

export const LOCALES = ["da", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * English is the default. The app was written in Danish for two people, and is
 * now public — someone arriving without a saved preference is far more likely
 * to read English than Danish. A signed-in user's own choice always wins, and
 * every string, including the exercise content, exists in both.
 */
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, unknown> = { da, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export type Vars = Record<string, string | number>;

function resolve(dict: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{{${name}}}`,
  );
}

export type TFunction = {
  (key: string, vars?: Vars): string;
  /** Resolve a key that points at an array of strings (e.g. guide steps). */
  list: (key: string) => string[];
  locale: Locale;
};

/**
 * Build a translator bound to one locale. Falls back to the default locale for
 * a missing key, then to the key itself so gaps are visible, never silent.
 */
export function createT(locale: Locale = DEFAULT_LOCALE): TFunction {
  const lookup = (key: string): unknown => {
    const hit = resolve(dictionaries[locale], key);
    if (hit !== undefined) return hit;
    return resolve(dictionaries[DEFAULT_LOCALE], key);
  };

  const fn = ((key: string, vars?: Vars) => {
    const value = lookup(key);
    return typeof value === "string" ? interpolate(value, vars) : key;
  }) as TFunction;

  fn.list = (key: string) => {
    const value = lookup(key);
    return Array.isArray(value) ? (value as string[]) : [];
  };
  fn.locale = locale;
  return fn;
}

/**
 * Default-locale translator, for the few places with no user context (metadata,
 * unauthenticated error text). Prefer the server helper or the hook.
 */
export const t = createT(DEFAULT_LOCALE);
export const tList = t.list;
