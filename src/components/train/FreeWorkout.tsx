"use client";

import { useState } from "react";
import { ActiveWorkout, type ActiveExercise, type LoggedSet } from "./ActiveWorkout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlusIcon } from "@/components/ui/icons";
import { useT } from "@/components/app/I18nProvider";
import type { MediaPref } from "@/lib/domain/types";

export interface LibraryEntry {
  id: string;
  name: string;
  unit: "kg" | "sek" | "reps" | "km";
  isBodyweight: boolean;
  category: string;
  svgKey: string | null;
  imageUrl: string | null;
  steps: string[];
  cues: string[];
}

/**
 * Free training (spec §6): no template — the user picks exercises from the
 * library as they go, and the same logging surface is reused for each.
 */
export function FreeWorkout({
  sessionId,
  library,
  initialSets,
  mediaPref = "illustration",
}: {
  sessionId: string;
  library: LibraryEntry[];
  initialSets: LoggedSet[];
  mediaPref?: MediaPref;
}) {
  const t = useT();
  const [chosen, setChosen] = useState<ActiveExercise[]>(() =>
    // Resume: rebuild the picker from whatever was already logged.
    Array.from(new Set(initialSets.map((s) => s.exerciseId))).flatMap((id) => {
      const entry = library.find((l) => l.id === id);
      return entry ? [toActive(entry)] : [];
    }),
  );
  const [picking, setPicking] = useState(chosen.length === 0);
  const [query, setQuery] = useState("");

  const filtered = library.filter(
    (l) =>
      !chosen.some((c) => c.exerciseId === l.id) &&
      l.name.toLowerCase().includes(query.toLowerCase()),
  );

  if (picking) {
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
                  setChosen((prev) => [...prev, toActive(l)]);
                  setPicking(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-elev px-4 py-3 text-left active:brightness-95"
              >
                <span className="font-medium text-text">{l.name}</span>
                <PlusIcon size={18} className="text-accent" />
              </button>
            </li>
          ))}
        </ul>
        {chosen.length > 0 && (
          <Button variant="ghost" onClick={() => setPicking(false)}>
            {t("common.back")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ActiveWorkout
        sessionId={sessionId}
        workoutName={t("train.freeWorkout")}
        exercises={chosen}
        initialSets={initialSets}
        mediaPref={mediaPref}
      />
      <Button variant="secondary" onClick={() => setPicking(true)}>
        <PlusIcon size={18} /> {t("train.addExercise")}
      </Button>
    </div>
  );
}

/** Library entry -> the shape the logging screen consumes (no template targets). */
function toActive(entry: LibraryEntry): ActiveExercise {
  return {
    workoutExerciseId: null,
    exerciseId: entry.id,
    name: entry.name,
    unit: entry.unit,
    isBodyweight: entry.isBodyweight,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetSeconds: entry.unit === "sek" ? 30 : null,
    restSeconds: 90,
    svgKey: entry.svgKey,
    imageUrl: entry.imageUrl,
    steps: entry.steps,
    cues: entry.cues,
    lastWeight: null,
    lastReps: [],
    lastSeconds: null,
    suggestion: null,
  };
}
