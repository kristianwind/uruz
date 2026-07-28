"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardMuted } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";
import { CoachText } from "./CoachText";
import type { AdaptationProposalInput } from "@/app/(app)/library/actions";

interface Proposal {
  message: string;
  swaps: { fromExerciseId: string; fromName: string; toExerciseId: string; toName: string; reason: string }[];
  adjustments: {
    exerciseId: string;
    name: string;
    targetSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    targetSeconds?: number;
    restSeconds?: number;
    reason: string;
  }[];
  removals: { exerciseId: string; name: string; reason: string }[];
  fromModel: boolean;
  mentionsPain: boolean;
}

/**
 * "Fortæl Mimir om en skavank eller et ønske."
 *
 * The user writes in plain language; Mimir proposes concrete changes, which are
 * shown as a reviewable list. Nothing is saved until the user approves, and the
 * result is saved as a *copy* so the original programme survives.
 */
export function AdaptWorkout({
  workoutId,
  onApply,
}: {
  workoutId: string;
  onApply: (input: {
    workoutId: string;
    proposal: AdaptationProposalInput;
  }) => Promise<string>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [request, setRequest] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!request.trim()) return;
    setBusy(true);
    setError(null);
    setProposal(null);
    try {
      const res = await fetch("/api/coach/adapt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workoutId, request: request.trim(), remember }),
      });
      if (!res.ok) throw new Error("failed");
      setProposal(await res.json());
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  const changeCount =
    (proposal?.swaps.length ?? 0) +
    (proposal?.adjustments.length ?? 0) +
    (proposal?.removals.length ?? 0);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text">ᛘ {t("coach.adaptTitle")}</h2>
        <CardMuted>{t("coach.adaptDesc")}</CardMuted>
      </div>

      <textarea
        rows={2}
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        placeholder={t("coach.adaptPlaceholder")}
        maxLength={500}
        className="w-full resize-none rounded-xl border border-border bg-elev-2 p-3 text-sm text-text placeholder:text-faint focus:border-accent focus:outline-none"
      />

      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span>
          {t("coach.adaptRemember")}
          <span className="block text-faint">{t("coach.adaptRememberHint")}</span>
        </span>
      </label>

      <Button variant="secondary" onClick={ask} disabled={busy || !request.trim()}>
        {busy ? t("coach.thinking") : t("coach.adaptAsk")}
      </Button>

      {error && <p className="text-sm text-danger">{error}</p>}

      {proposal && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <CoachText text={proposal.message} className="text-sm leading-relaxed text-muted" />

          {proposal.mentionsPain && (
            <p className="rounded-lg border border-info/40 bg-info/10 p-2.5 text-xs text-info">
              {t("coach.adaptMedical")}
            </p>
          )}

          {changeCount === 0 ? (
            <CardMuted>{t("coach.adaptNoChanges")}</CardMuted>
          ) : (
            <ul className="flex flex-col gap-2">
              {proposal.swaps.map((s) => (
                <ChangeRow
                  key={`swap-${s.fromExerciseId}`}
                  label={t("coach.adaptSwap")}
                  tone="accent"
                  title={`${s.fromName} → ${s.toName}`}
                  reason={s.reason}
                />
              ))}
              {proposal.adjustments.map((a) => (
                <ChangeRow
                  key={`adj-${a.exerciseId}`}
                  label={t("coach.adaptAdjust")}
                  tone="muted"
                  title={`${a.name}: ${[
                    a.targetSets && `${a.targetSets} ${t("common.sets")}`,
                    a.targetRepsMin && a.targetRepsMax && `${a.targetRepsMin}–${a.targetRepsMax} ${t("common.reps")}`,
                    a.targetSeconds && `${a.targetSeconds} ${t("common.sec")}`,
                    a.restSeconds !== undefined && `${a.restSeconds}s ${t("common.rest")}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}`}
                  reason={a.reason}
                />
              ))}
              {proposal.removals.map((r) => (
                <ChangeRow
                  key={`rem-${r.exerciseId}`}
                  label={t("coach.adaptRemove")}
                  tone="danger"
                  title={r.name}
                  reason={r.reason}
                />
              ))}
            </ul>
          )}

          {changeCount > 0 && (
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const newId = await onApply({
                    workoutId,
                    proposal: {
                      swaps: proposal.swaps,
                      adjustments: proposal.adjustments,
                      removals: proposal.removals,
                    },
                  });
                  router.push(`/library/workout/${newId}`);
                  router.refresh();
                })
              }
            >
              {pending ? t("common.saving") : t("coach.adaptApply")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function ChangeRow({
  label,
  title,
  reason,
  tone,
}: {
  label: string;
  title: string;
  reason: string;
  tone: "accent" | "muted" | "danger";
}) {
  return (
    <li className="rounded-lg border border-border bg-elev-2 p-2.5">
      <span
        className={cn(
          "mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          tone === "accent" && "bg-accent-soft text-accent",
          tone === "muted" && "bg-elev text-muted",
          tone === "danger" && "bg-danger-soft text-danger",
        )}
      >
        {label}
      </span>
      <p className="text-sm font-medium text-text">{title}</p>
      {reason && <p className="mt-0.5 text-xs text-muted">{reason}</p>}
    </li>
  );
}
