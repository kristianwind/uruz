"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/app/I18nProvider";

/** Run this week's analysis on demand and refresh the message list. */
export function AnalyzeButton() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="secondary"
      fullWidth
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/coach/analyze", { method: "POST" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? t("coach.thinking") : t("coach.weeklyAnalysis")}
    </Button>
  );
}
