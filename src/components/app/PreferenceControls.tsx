"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import type { Locale } from "@/lib/i18n/core";
import type { MediaPref, ModePref, ThemePref } from "@/lib/domain/types";

type Mode = ModePref;
type Flavor = ThemePref;

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm font-medium text-text">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex rounded-lg border border-border bg-elev-2 p-0.5"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
              value === o.value ? "bg-accent text-on-accent" : "text-muted hover:text-text",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * All display preferences in one place: theme flavour, colour scheme, language
 * and how exercises are illustrated.
 *
 * Theme and scheme apply instantly on the client (and persist to localStorage,
 * mirrored by the pre-paint script). Language and media preference round-trip
 * through the server, because they change server-rendered content.
 */
export function PreferenceControls({
  initialMode = "dark",
  initialTheme = "norse",
  initialLocale,
  initialMedia = "illustration",
  onPersistTheme,
  onPersistLocale,
  onPersistMedia,
}: {
  initialMode?: Mode;
  initialTheme?: Flavor;
  initialLocale: Locale;
  initialMedia?: MediaPref;
  onPersistTheme?: (patch: { modePref?: Mode; themePref?: Flavor }) => void;
  onPersistLocale?: (locale: string) => Promise<void>;
  onPersistMedia?: (pref: MediaPref) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [flavor, setFlavor] = useState<Flavor>(initialTheme);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [media, setMedia] = useState<MediaPref>(initialMedia);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("uruz-mode", mode);
  }, [mode]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", flavor);
    localStorage.setItem("uruz-theme", flavor);
  }, [flavor]);

  return (
    <div className="divide-y divide-border">
      <Segmented<Flavor>
        label={t("me.theme")}
        value={flavor}
        onChange={(v) => {
          setFlavor(v);
          onPersistTheme?.({ themePref: v });
        }}
        options={[
          { value: "norse", label: t("me.themeNorse") },
          { value: "plain", label: t("me.themePlain") },
        ]}
      />
      <Segmented<Mode>
        label={t("me.mode")}
        value={mode}
        onChange={(v) => {
          setMode(v);
          onPersistTheme?.({ modePref: v });
        }}
        options={[
          { value: "dark", label: t("me.modeDark") },
          { value: "light", label: t("me.modeLight") },
        ]}
      />
      <Segmented<Locale>
        label={t("me.language")}
        value={locale}
        disabled={pending}
        onChange={(v) => {
          setLocale(v);
          startTransition(async () => {
            await onPersistLocale?.(v);
            router.refresh();
          });
        }}
        options={[
          { value: "da", label: t("me.languageDa") },
          { value: "en", label: t("me.languageEn") },
        ]}
      />
      <Segmented<MediaPref>
        label={t("me.exerciseMedia")}
        value={media}
        disabled={pending}
        onChange={(v) => {
          setMedia(v);
          startTransition(async () => {
            await onPersistMedia?.(v);
            router.refresh();
          });
        }}
        options={[
          { value: "illustration", label: t("me.mediaIllustration") },
          { value: "photo", label: t("me.mediaPhoto") },
        ]}
      />
    </div>
  );
}
