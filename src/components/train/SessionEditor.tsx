"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CardMuted } from "@/components/ui/Card";
import { SetRow } from "./SetRow";
import { TrashIcon } from "@/components/ui/icons";
import { useT } from "@/components/app/I18nProvider";
import { useSync } from "@/lib/offline/useSync";
import type { LoggedSet } from "./ActiveWorkout";

export interface SessionGroup {
  exerciseId: string;
  name: string;
  isTimed: boolean;
  sets: LoggedSet[];
}

/**
 * A finished workout, corrected after the fact.
 *
 * Deliberately the same `SetRow` as the live screen: a set is edited the same
 * way whether it was logged a minute ago or last month, and there is only one
 * place for that behaviour to be right.
 *
 * Edits go through the offline queue like everything else, so correcting a
 * workout on the bus home works with no signal.
 */
export function SessionEditor({
  sessionId,
  groups,
}: {
  sessionId: string;
  groups: SessionGroup[];
}) {
  const t = useT();
  const router = useRouter();
  const { push } = useSync();

  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const removeSet = async (setId: string) => {
    setRemoved((prev) => new Set(prev).add(setId));
    await push({ kind: "delete_set", payload: { setId } });
  };

  const editSet = async (
    setId: string,
    patch: { weight?: number | null; reps?: number | null; seconds?: number | null },
  ) => {
    await push({ kind: "update_set", payload: { setId, ...patch } });
  };

  const deleteWorkout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/sessions/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        router.push("/train/history");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const visible = groups
    .map((g) => ({ ...g, sets: g.sets.filter((s) => !removed.has(s.id)) }))
    .filter((g) => g.sets.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <CardMuted>{t("train.editSets")}</CardMuted>

      {visible.map((group) => (
        <section key={group.exerciseId}>
          <h2 className="mb-2 text-sm font-semibold text-text">{group.name}</h2>
          <ul className="flex flex-col gap-2">
            {group.sets.map((s, i) => (
              <SetRow
                key={s.id}
                set={s}
                index={i}
                isTimed={group.isTimed}
                onDelete={() => removeSet(s.id)}
                onEdit={(patch) => editSet(s.id, patch)}
              />
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-2 border-t border-border pt-4">
        {confirming ? (
          <div className="flex flex-col gap-3">
            {/* Deleting a whole workout removes every set in it, so it asks
                once rather than doing it on a mis-tap in a gym. */}
            <p className="text-sm text-danger">{t("train.sessionDeleteConfirm")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={deleteWorkout} disabled={busy}>
                {busy ? t("common.saving") : t("train.sessionDelete")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            <TrashIcon size={16} /> {t("train.sessionDelete")}
          </Button>
        )}
      </div>
    </div>
  );
}
