"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardMuted } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/app/I18nProvider";

/**
 * Export and delete your own data (spec §10).
 *
 * Deletion asks the user to type their own name — irreversible actions should
 * take a deliberate moment, not a single mis-tap in a gym.
 */
export function DataSection({ displayName }: { displayName: string }) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: typed }),
      });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error === "last_admin" ? t("admin.lastAdmin") : t("errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <a href="/api/export/json" download>
        <Card interactive className="flex items-center justify-between py-3">
          <span className="font-medium">{t("me.exportData")}</span>
          <span className="text-xs text-faint">JSON</span>
        </Card>
      </a>
      <a href="/api/export/csv" download>
        <Card interactive className="flex items-center justify-between py-3">
          <span className="font-medium">{t("stats.export")}</span>
          <span className="text-xs text-faint">CSV</span>
        </Card>
      </a>

      {!confirming ? (
        <button onClick={() => setConfirming(true)} className="text-left">
          <Card interactive className="py-3 text-sm text-danger">
            {t("me.deleteData")}
          </Card>
        </button>
      ) : (
        <Card className="flex flex-col gap-2 border-danger/50">
          <CardMuted>
            {t("me.deleteData")} — skriv <strong className="text-text">{displayName}</strong> for
            at bekræfte.
          </CardMuted>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <Button
              variant="danger"
              disabled={busy || typed !== displayName}
              onClick={remove}
              className="flex-1"
            >
              {busy ? t("common.saving") : t("common.delete")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </Card>
      )}
    </section>
  );
}
