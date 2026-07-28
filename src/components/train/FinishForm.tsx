"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Stepper } from "./Stepper";
import { useSync } from "@/lib/offline/useSync";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";

const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

/**
 * Session wrap-up: mood, effort, optional bodyweight and a free note (spec §6).
 * Everything is optional — a user in a hurry just taps "Afslut træning".
 */
export function FinishForm({
  sessionId,
  summary,
}: {
  sessionId: string;
  summary: { sets: number; volume: number; prs: number; minutes: number };
}) {
  const t = useT();
  const router = useRouter();
  const { push } = useSync();
  const [mood, setMood] = useState<number | null>(null);
  const [rpe, setRpe] = useState(6);
  const [bodyweight, setBodyweight] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    await push({
      kind: "finish_session",
      payload: {
        sessionId,
        mood,
        rpe,
        bodyweight: bodyweight > 0 ? bodyweight : null,
        note: note.trim() || null,
      },
    });
    router.push("/train");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* What you just did */}
      <section className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t("common.sets")} value={String(summary.sets)} />
        <Stat label={t("stats.tonnage")} value={`${Math.round(summary.volume)} kg`} />
        <Stat label={t("common.min")} value={String(summary.minutes)} />
      </section>
      {summary.prs > 0 && (
        <p className="rounded-xl border border-success bg-success-soft px-4 py-3 text-center font-semibold text-success">
          ⚡ {summary.prs} {t("train.prNew")}
        </p>
      )}

      {/* Mood */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">{t("train.mood")}</h2>
        <div className="flex justify-between gap-2">
          {MOODS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${t("train.mood")} ${i + 1}`}
              aria-pressed={mood === i + 1}
              onClick={() => setMood(i + 1)}
              className={cn(
                "h-14 flex-1 rounded-xl border text-2xl transition-colors",
                mood === i + 1 ? "border-accent bg-accent-soft" : "border-border bg-elev-2",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </section>

      {/* Effort + bodyweight */}
      <section className="flex gap-3">
        <Stepper label={t("train.rpe")} value={rpe} onChange={setRpe} min={1} max={10} className="flex-1" />
        <Stepper
          label={`${t("train.bodyweight")} (${t("common.optional")})`}
          value={bodyweight}
          onChange={setBodyweight}
          step={0.5}
          max={500}
          className="flex-1"
        />
      </section>

      {/* Note */}
      <section>
        <label htmlFor="note" className="mb-2 block text-sm font-semibold text-muted">
          {t("train.note")}
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("train.notePlaceholder")}
          className="w-full rounded-xl border border-border bg-elev-2 p-3 text-base text-text placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </section>

      <Button size="lg" fullWidth onClick={finish} disabled={busy}>
        {busy ? t("common.saving") : t("common.finishWorkout")}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-elev p-3">
      <p className="tabnum text-xl font-bold text-text">{value}</p>
      <p className="text-xs text-faint">{label}</p>
    </div>
  );
}
