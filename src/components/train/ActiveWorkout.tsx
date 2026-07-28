"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Stepper } from "./Stepper";
import { RestTimer } from "./RestTimer";
import { PRToast } from "./PRToast";
import { SetRow } from "./SetRow";
import { ExerciseGuide } from "./ExerciseGuide";
import { useSync } from "@/lib/offline/useSync";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import type { MediaPref } from "@/lib/domain/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  CloudOffIcon,
} from "@/components/ui/icons";

/** One exercise as presented to the logging screen. */
export interface ActiveExercise {
  workoutExerciseId: string | null;
  exerciseId: string;
  name: string;
  unit: "kg" | "sek" | "reps" | "km";
  isBodyweight: boolean;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSeconds: number | null;
  restSeconds: number;
  /** What the exercise looks like, and how it is done — shown in place. */
  svgKey: string | null;
  imageUrl: string | null;
  steps: string[];
  cues: string[];
  /** Prefill from the last time this exercise was trained. */
  lastWeight: number | null;
  lastReps: number[];
  lastSeconds: number | null;
  /** Suggestion from the progression engine, if any. */
  suggestion: { weight: number; reps: number; reason: string } | null;
}

/** A set already logged in this session. */
export interface LoggedSet {
  id: string;
  exerciseId: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  seconds: number | null;
  isWarmup: boolean;
  isPr: boolean;
}

export function ActiveWorkout({
  sessionId,
  workoutName,
  exercises,
  initialSets,
  mediaPref = "illustration",
}: {
  sessionId: string;
  workoutName: string;
  exercises: ActiveExercise[];
  initialSets: LoggedSet[];
  mediaPref?: MediaPref;
}) {
  const t = useT();
  const router = useRouter();
  const { online, pending, syncing, push } = useSync();
  // Ninety seconds of rest is long enough for the phone to lock. Keep the
  // screen on for as long as this screen is open, and not a moment longer.
  useWakeLock();

  const [index, setIndex] = useState(0);
  const [sets, setSets] = useState<LoggedSet[]>(initialSets);
  const [prName, setPrName] = useState<string | null>(null);
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(90);

  const current = exercises[index];
  const isTimed = current?.unit === "sek";

  // Working values for the next set, seeded from the progression suggestion or
  // last session so the common case is a single tap on "Log sæt".
  const seedWeight = current?.suggestion?.weight ?? current?.lastWeight ?? 20;
  const seedReps =
    current?.suggestion?.reps ?? current?.lastReps[0] ?? current?.targetRepsMin ?? 10;
  const seedSeconds = current?.lastSeconds ?? current?.targetSeconds ?? 30;

  const [weight, setWeight] = useState(seedWeight);
  const [reps, setReps] = useState(seedReps);
  const [seconds, setSeconds] = useState(seedSeconds);
  const [isWarmup, setIsWarmup] = useState(false);
  // Track which exercise the working values belong to, so switching exercises
  // reseeds them without an effect (avoids a flash of the previous values).
  const [seededFor, setSeededFor] = useState(current?.exerciseId ?? "");
  if (current && seededFor !== current.exerciseId) {
    setSeededFor(current.exerciseId);
    setWeight(seedWeight);
    setReps(seedReps);
    setSeconds(seedSeconds);
    setIsWarmup(false);
  }

  const setsForCurrent = useMemo(
    () => sets.filter((s) => s.exerciseId === current?.exerciseId),
    [sets, current?.exerciseId],
  );

  const logSet = useCallback(async () => {
    if (!current) return;
    const id = crypto.randomUUID();
    const payload = {
      id,
      sessionId,
      exerciseId: current.exerciseId,
      setIndex: setsForCurrent.length,
      weight: isTimed ? null : weight,
      reps: isTimed ? null : reps,
      seconds: isTimed ? seconds : null,
      isWarmup,
      rir: null,
    };

    // Optimistic: the set appears immediately, even with no network.
    setSets((prev) => [
      ...prev,
      {
        id,
        exerciseId: current.exerciseId,
        setIndex: payload.setIndex,
        weight: payload.weight,
        reps: payload.reps,
        seconds: payload.seconds,
        isWarmup,
        isPr: false,
      },
    ]);

    // Start the rest timer right away (spec §6).
    if (!isWarmup) {
      setRestSeconds(current.restSeconds);
      setRestStartedAt(Date.now());
    }
    setIsWarmup(false);

    await push({ kind: "log_set", payload });

    // Ask the server whether this beat a record so we can celebrate. Failing
    // (offline) is fine — the set is queued and PR flags settle on sync.
    try {
      const res = await fetch("/api/sessions/pr-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isPr) {
          setPrName(current.name);
          setSets((prev) => prev.map((s) => (s.id === id ? { ...s, isPr: true } : s)));
        }
      }
    } catch {
      /* offline — no celebration now, the record still lands on sync */
    }
  }, [current, sessionId, setsForCurrent.length, weight, reps, seconds, isWarmup, isTimed, push]);

  const removeSet = useCallback(
    async (setId: string) => {
      setSets((prev) => prev.filter((s) => s.id !== setId));
      await push({ kind: "delete_set", payload: { setId } });
    },
    [push],
  );

  const editSet = useCallback(
    async (setId: string, patch: { weight?: number | null; reps?: number | null; seconds?: number | null }) => {
      setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)));
      await push({ kind: "update_set", payload: { setId, ...patch } });
    },
    [push],
  );

  if (!current) {
    return (
      <div className="pt-10 text-center text-muted">
        <p>{t("library.empty")}</p>
        <Button className="mt-4" onClick={() => router.push("/train")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const targetLabel = isTimed
    ? t("train.targetHold", { sec: current.targetSeconds ?? seconds })
    : current.targetRepsMin && current.targetRepsMax
      ? t("train.targetReps", { min: current.targetRepsMin, max: current.targetRepsMax })
      : "";

  return (
    <div className="flex flex-col gap-4">
      <PRToast exerciseName={prName} onDone={() => setPrName(null)} />

      {/* Progress header */}
      <header>
        <div className="flex items-center justify-between">
          <h1 className="truncate text-lg font-bold text-text">{workoutName}</h1>
          {(pending > 0 || syncing || !online) && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <CloudOffIcon size={13} />
              {pending > 0 ? `${pending}` : ""} {syncing ? t("common.syncing") : t("common.offline")}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {t("train.exerciseOfTotal", { current: index + 1, total: exercises.length })}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {exercises.map((ex, i) => (
            <span
              key={ex.exerciseId}
              className={cn(
                "h-1 flex-1 rounded-full",
                i < index ? "bg-success" : i === index ? "bg-accent" : "bg-elev-2",
              )}
            />
          ))}
        </div>
      </header>

      {/* Current exercise */}
      <section className="rounded-xl border border-border bg-elev p-4">
        <h2 className="text-xl font-bold text-text">{current.name}</h2>
        {targetLabel && <p className="mt-0.5 text-sm text-muted">{targetLabel}</p>}

        <ExerciseGuide
          name={current.name}
          svgKey={current.svgKey}
          imageUrl={current.imageUrl}
          steps={current.steps}
          cues={current.cues}
          mediaPref={mediaPref}
        />
        {current.suggestion && current.suggestion.reason === "increase" && (
          <p className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
            {t("train.suggestUp", { weight: current.suggestion.weight })}
          </p>
        )}
        {current.lastWeight !== null && !isTimed && (
          <p className="mt-2 text-xs text-faint">
            {t("train.lastTime")}: {current.lastWeight} kg × {current.lastReps.join(", ")}
          </p>
        )}

        {/* Steppers */}
        <div className="mt-4 flex gap-3">
          {isTimed ? (
            <Stepper
              label={t("common.sec")}
              value={seconds}
              onChange={setSeconds}
              step={5}
              max={3600}
              className="flex-1"
            />
          ) : (
            <>
              {!current.isBodyweight && (
                <Stepper
                  label={t("common.kg")}
                  value={weight}
                  onChange={setWeight}
                  step={2.5}
                  max={1000}
                  className="flex-1"
                />
              )}
              <Stepper
                label={t("common.reps")}
                value={reps}
                onChange={setReps}
                step={1}
                max={100}
                className="flex-1"
              />
            </>
          )}
        </div>

        {/* Log + warm-up toggle */}
        <div className="mt-4 flex items-center gap-2">
          <Button size="lg" fullWidth onClick={logSet} className="flex-1">
            <CheckIcon size={20} /> {t("train.logSet")}
          </Button>
          <button
            type="button"
            aria-pressed={isWarmup}
            onClick={() => setIsWarmup((w) => !w)}
            className={cn(
              "h-14 shrink-0 rounded-xl border px-3 text-xs font-semibold",
              isWarmup
                ? "border-warning bg-warning/15 text-warning"
                : "border-border text-faint",
            )}
          >
            {t("train.warmup")}
          </button>
        </div>

        {/* Logged sets for this exercise */}
        {setsForCurrent.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {setsForCurrent.map((s, i) => (
              <SetRow
                key={s.id}
                set={s}
                index={i}
                isTimed={isTimed}
                onDelete={() => removeSet(s.id)}
                onEdit={(patch) => editSet(s.id, patch)}
              />
            ))}
          </ul>
        )}
      </section>

      <RestTimer
        seconds={restSeconds}
        startedAt={restStartedAt}
        onSkip={() => setRestStartedAt(null)}
        onAdjust={(delta) => setRestSeconds((s) => Math.max(15, s + delta))}
      />

      {/* Exercise navigation */}
      <nav className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label={t("train.previousExercise")}
        >
          <ChevronLeftIcon size={20} />
        </Button>
        {index < exercises.length - 1 ? (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIndex((i) => i + 1)}
            className="flex-1"
          >
            {t("train.nextExercise")} <ChevronRightIcon size={18} />
          </Button>
        ) : (
          <Button
            variant="success"
            fullWidth
            onClick={() => router.push(`/train/finish/${sessionId}`)}
            className="flex-1"
          >
            {t("common.finishWorkout")}
          </Button>
        )}
      </nav>

      <Button
        variant="ghost"
        onClick={() => router.push(`/train/finish/${sessionId}`)}
        className="text-sm"
      >
        {t("common.finishWorkout")}
      </Button>
    </div>
  );
}
