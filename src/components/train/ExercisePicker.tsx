"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlusIcon } from "@/components/ui/icons";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import type { MediaPref } from "@/lib/domain/types";
import { useT } from "@/components/app/I18nProvider";
import type { ActiveExercise } from "./ActiveWorkout";

/** One library exercise as offered by the picker. */
export interface LibraryEntry {
  id: string;
  name: string;
  unit: "kg" | "sek" | "reps" | "km";
  isBodyweight: boolean;
  category: string;
  equipment: string;
  svgKey: string | null;
  imageUrl: string | null;
  steps: string[];
  cues: string[];
  /** What this exercise was last done at, so the picker starts there. */
  lastWeight: number | null;
  lastReps: number[];
  lastSeconds: number | null;
  lastDistanceM: number | null;
  lastWatts: number | null;
}

/**
 * Pick an exercise from the library.
 *
 * Shared by free training and by adding one to a template workout mid-session:
 * a plan meets the gym, a machine is taken, and something else goes in its
 * place. One picker, so both behave the same.
 */
export function ExercisePicker({
  library,
  exclude,
  onPick,
  onCancel,
  mediaPref = "illustration",
}: {
  library: LibraryEntry[];
  exclude: string[];
  onPick: (entry: LibraryEntry) => void;
  onCancel?: () => void;
  mediaPref?: MediaPref;
}) {
  const t = useT();
  const [query, setQuery] = useState("");

  const filtered = library.filter(
    (l) => !exclude.includes(l.id) && l.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">{t("train.addExercise")}</h1>
      <Input
        placeholder={t("common.search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <ul className="flex flex-col gap-2">
        {filtered.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => {
                onPick(l);
                setQuery("");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-elev p-3 text-left active:brightness-95"
            >
              {/* A name alone does not say which machine it is. The drawing
                  does, so the picker shows it the same way the library does. */}
              <span className="h-12 w-14 shrink-0 rounded-lg bg-elev-2 p-1">
                <ExerciseMedia svgKey={l.svgKey} imageUrl={l.imageUrl} alt={l.name} pref={mediaPref} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-text">{l.name}</span>
                <span className="block truncate text-xs text-faint">
                  {t(`muscles.${l.category}`)} · {t(`equipment.${l.equipment}`)}
                </span>
              </span>
              <PlusIcon size={18} className="shrink-0 text-accent" />
            </button>
          </li>
        ))}
      </ul>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          {t("common.back")}
        </Button>
      )}
    </div>
  );
}

/**
 * Library entry -> the shape the logging screen consumes.
 *
 * An exercise picked here has no template row behind it, so it carries no
 * prescription (`workoutExerciseId: null`) — the screen counts its sets rather
 * than measuring them against a target nobody chose. The last-used numbers do
 * come along, so it opens where you left off.
 */
export function toActive(entry: LibraryEntry): ActiveExercise {
  return {
    workoutExerciseId: null,
    exerciseId: entry.id,
    name: entry.name,
    unit: entry.unit,
    isBodyweight: entry.isBodyweight,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetSeconds: entry.unit === "sek" ? (entry.lastSeconds ?? 30) : null,
    restSeconds: 90,
    // Picked by hand, so nothing has declared it a warm-up. The toggle beside
    // "Log set" is still there for the times it is one.
    isWarmup: false,
    svgKey: entry.svgKey,
    imageUrl: entry.imageUrl,
    steps: entry.steps,
    cues: entry.cues,
    lastWeight: entry.lastWeight,
    lastReps: entry.lastReps,
    lastSeconds: entry.lastSeconds,
    lastDistanceM: entry.lastDistanceM,
    lastWatts: entry.lastWatts,
    suggestion: null,
  };
}
