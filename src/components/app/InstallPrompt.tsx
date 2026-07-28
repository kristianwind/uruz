"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/app/I18nProvider";

const DISMISSED_KEY = "uruz-install-dismissed";

/**
 * A one-time nudge to install the PWA, shown on a phone that is still running
 * in a browser tab (spec §14).
 *
 * Only appears on mobile, only when not already installed, and never again
 * once dismissed — an install banner that keeps coming back is worse than no
 * banner at all.
 */
export function InstallPrompt() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Let the user get their bearings before suggesting anything.
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("install.title")}
      className="fixed inset-x-3 bottom-20 z-40 rounded-xl border border-accent/50 bg-elev p-4 shadow-[var(--shadow)]"
    >
      <p className="mb-1 font-semibold text-text">ᚢ {t("install.title")}</p>
      <p className="mb-3 text-sm text-muted">{t("install.iphone.0")}</p>
      <div className="flex gap-2">
        <Link
          href="/install"
          onClick={dismiss}
          className="flex-1 rounded-lg bg-accent px-3 py-2 text-center text-sm font-semibold text-on-accent"
        >
          {t("me.installApp")}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted"
        >
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
