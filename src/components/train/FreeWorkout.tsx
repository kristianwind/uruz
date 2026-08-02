"use client";

import { useState } from "react";
import { ActiveWorkout, type ActiveExercise, type LoggedSet } from "./ActiveWorkout";
import { ExercisePicker, toActive, type LibraryEntry } from "./ExercisePicker";
import { useT } from "@/components/app/I18nProvider";
import type { MediaPref } from "@/lib/domain/types";

export type { LibraryEntry };

/**
 * Free training (spec §6): no template — the user picks exercises from the
 * library as they go, and the same logging surface is reused for each.
 *
 * Adding a further exercise mid-session is the logging screen's own job now
 * (it has the library), so this only owns the very first pick — the moment
 * where there is nothing to log yet.
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

  if (chosen.length === 0) {
    return (
      <ExercisePicker
        library={library}
        exclude={[]}
        onPick={(entry) => setChosen([toActive(entry)])}
      />
    );
  }

  return (
    <ActiveWorkout
      sessionId={sessionId}
      workoutName={t("train.freeWorkout")}
      exercises={chosen}
      initialSets={initialSets}
      library={library}
      mediaPref={mediaPref}
    />
  );
}
