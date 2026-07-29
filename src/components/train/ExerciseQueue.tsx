"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import { CheckIcon } from "@/components/ui/icons";
import type { ActiveExercise, LoggedSet } from "./ActiveWorkout";

/**
 * What is coming, on a screen with room to show it.
 *
 * On a phone the workout is walked one exercise at a time — the progress bars
 * in the header are the whole overview, and that is the right trade when every
 * pixel is between a thumb and a number. On a wide screen there is no such
 * trade: the list can simply be there, showing what is done, what is left, and
 * letting you jump straight to an exercise instead of stepping through.
 *
 * Hidden below 1024px, so the phone is untouched.
 */
export function ExerciseQueue({
  exercises,
  index,
  sets,
  onPick,
}: {
  exercises: ActiveExercise[];
  index: number;
  sets: LoggedSet[];
  onPick: (i: number) => void;
}) {
  const t = useT();
  const loggedFor = (exerciseId: string) =>
    sets.filter((s) => s.exerciseId === exerciseId && !s.isWarmup).length;

  return (
    <aside className="hidden lg:block lg:sticky lg:top-6">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-faint">
        {t("train.exercise")}
      </h2>
      <ol className="flex flex-col gap-1">
        {exercises.map((ex, i) => {
          const done = loggedFor(ex.exerciseId);
          const complete = done >= ex.targetSets;
          const current = i === index;
          return (
            <li key={ex.exerciseId}>
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                  current
                    ? "bg-accent-soft text-text"
                    : "text-muted hover:bg-elev-2 hover:text-text",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                    complete
                      ? "bg-success-soft text-success"
                      : current
                        ? "bg-accent text-on-accent"
                        : "bg-elev-2 text-faint",
                  )}
                >
                  {complete ? <CheckIcon size={13} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{ex.name}</span>
                  <span className="block text-xs text-faint tabnum">
                    {done}/{ex.targetSets} {t("common.sets")}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
