"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/app/I18nProvider";

/**
 * Last-resort error screen. Deliberately calm and non-technical: the user is
 * usually mid-workout and needs a way forward, not a stack trace. Anything
 * already logged is safe in the offline queue, and we say so.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("Uruz error boundary:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-4xl text-accent">ᚢ</span>
      <h1 className="text-xl font-bold">{t("errors.generic")}</h1>
      <p className="text-sm text-muted">{t("errors.offlineSaved")}</p>
      <div className="mt-2 flex w-full flex-col gap-2">
        <Button onClick={reset}>{t("common.retry")}</Button>
        <a href="/train" className="py-2 text-sm text-accent">
          {t("nav.train")}
        </a>
      </div>
    </main>
  );
}
