"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/app/I18nProvider";
import { TrashIcon } from "@/components/ui/icons";

/**
 * Take a workout out of the lists.
 *
 * There was no way to do this at all, which is why a list only ever grew: you
 * could duplicate a workout to adjust it, and the copy stayed for good. Six of
 * twelve workouts in real use were copies nobody had trained.
 *
 * What happens depends on whether it was ever used, and the server decides:
 * an untouched workout is deleted, a trained one is archived so the sessions
 * keep their name. The confirmation says which, because "delete" would be a
 * lie for half the cases.
 */
export function RemoveWorkoutButton({
  workoutId,
  usedInSessions,
  action,
}: {
  workoutId: string;
  /** Sessions trained from this workout — 0 means it can really be deleted. */
  usedInSessions: number;
  action: (workoutId: string) => Promise<"deleted" | "archived">;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        <TrashIcon size={16} /> {t("library.removeWorkout")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <p className="text-sm text-muted">
        {usedInSessions > 0
          ? t("library.removeArchives", { count: usedInSessions })
          : t("library.removeDeletes")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await action(workoutId);
              router.push("/library");
              router.refresh();
            })
          }
        >
          {pending ? t("common.saving") : t("library.removeWorkout")}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
