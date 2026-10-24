"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
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
  const [preview, setPreview] = useState<LibraryEntry | null>(null);

  const filtered = library.filter(
    (l) => !exclude.includes(l.id) && l.name.toLowerCase().includes(query.toLowerCase()),
  );

  function pick(entry: LibraryEntry) {
    onPick(entry);
    setQuery("");
    setPreview(null);
  }

  function open(entry: LibraryEntry) {
    setPreview(entry);
    // The list may have been scrolled far down; the preview starts at its top.
    window.scrollTo({ top: 0 });
  }

  if (preview) {
    return (
      <ExercisePreview
        entry={preview}
        mediaPref={mediaPref}
        onAdd={() => pick(preview)}
        onBack={() => setPreview(null)}
      />
    );
  }

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
          <li key={l.id} className="flex items-stretch rounded-xl border border-border bg-elev">
            {/* Two targets: the exercise itself opens a look at it first, the
                plus adds it straight away for whoever already knows. */}
            <button
              type="button"
              onClick={() => open(l)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl p-3 text-left active:brightness-95"
            >
              {/* A name alone does not say which machine it is. The drawing
                  does, so the picker shows it the same way the library does. */}
              <span className="h-12 w-14 shrink-0 rounded-lg bg-elev-2 p-1">
                <ExerciseMedia svgKey={l.svgKey} imageUrl={l.imageUrl} alt={l.name} pref={mediaPref} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-medium leading-snug text-text">{l.name}</span>
                <span className="block truncate text-xs text-faint">
                  {t(`muscles.${l.category}`)} · {t(`equipment.${l.equipment}`)}
                </span>
              </span>
              <ChevronRightIcon size={16} className="shrink-0 text-faint" />
            </button>
            <button
              type="button"
              onClick={() => pick(l)}
              aria-label={`${t("train.addExercise")}: ${l.name}`}
              className="grid w-14 shrink-0 place-items-center rounded-r-xl border-l border-border text-accent active:brightness-95"
            >
              <PlusIcon size={20} />
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
 * A look at the exercise before it goes into the workout.
 *
 * The thumbnail tells you roughly what a machine is; the steps tell you whether
 * it is the one you meant. Seeing them used to mean leaving the session for the
 * library, so the same drawing, steps and cues are here, one tap from the list,
 * with "Add" at the bottom where the thumb already is.
 */
function ExercisePreview({
  entry,
  mediaPref,
  onAdd,
  onBack,
}: {
  entry: LibraryEntry;
  mediaPref: MediaPref;
  onAdd: () => void;
  onBack: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm text-muted"
      >
        <ChevronLeftIcon size={16} /> {t("common.back")}
      </button>

      <div>
        <h1 className="text-xl font-bold text-text">{entry.name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {t(`muscles.${entry.category}`)} · {t(`equipment.${entry.equipment}`)}
        </p>
      </div>

      <div className="h-44 rounded-xl border border-border bg-elev p-3">
        <ExerciseMedia
          svgKey={entry.svgKey}
          imageUrl={entry.imageUrl}
          alt={entry.name}
          pref={mediaPref}
        />
      </div>

      {entry.steps.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
            {t("library.steps")}
          </h2>
          <ol className="flex flex-col gap-2.5">
            {entry.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {entry.cues.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
            {t("library.cues")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {entry.cues.map((cue, i) => (
              <li
                key={i}
                className="rounded-full border border-border bg-elev-2 px-3 py-1.5 text-sm text-text"
              >
                {cue}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button size="lg" fullWidth onClick={onAdd}>
        <PlusIcon size={18} /> {t("train.addExercise")}
      </Button>
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
