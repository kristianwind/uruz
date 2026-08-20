"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardMuted } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";

interface Probe {
  ok: boolean;
  provider: string;
  model: string;
  detail: string;
  baseUrl: string;
}

/**
 * Live check that the configured model actually answers.
 *
 * Worth its own button: an AI outage is invisible from inside the app (Kvasir
 * quietly falls back to rule-based coaching), so an admin needs a way to ask
 * "is the model reachable right now?".
 */
export function AIStatus({
  provider,
  model,
  configured,
}: {
  provider: string;
  model: string;
  configured: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">{t("admin.aiStatus")}</h2>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            !configured
              ? "bg-elev-2 text-faint"
              : probe === null
                ? "bg-elev-2 text-muted"
                : probe.ok
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger",
          )}
        >
          {!configured
            ? t("admin.aiNotConfigured")
            : probe === null
              ? "—"
              : probe.ok
                ? t("admin.aiReachable")
                : t("admin.aiUnreachable")}
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-faint">{t("admin.aiProvider")}</dt>
        <dd className="truncate text-muted">{provider}</dd>
        <dt className="text-faint">{t("admin.aiModel")}</dt>
        <dd className="truncate text-muted">{model || "—"}</dd>
      </dl>

      {configured && (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await fetch("/api/coach/probe");
              setProbe(res.ok ? await res.json() : null);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t("coach.thinking") : t("admin.aiCheck")}
        </Button>
      )}

      {probe && !probe.ok && <CardMuted className="break-all text-xs text-danger">{probe.detail}</CardMuted>}
    </Card>
  );
}
