"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { BodyMap, muscleIntensity } from "@/components/exercise/BodyMap";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { PlusIcon, MinusIcon, ClockIcon } from "@/components/ui/icons";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";
import type { MediaPref, ProgressionMode } from "@/lib/domain/types";
import type { SaveWorkoutInput } from "@/app/(app)/library/actions";

export interface BuilderLibraryExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  unit: "kg" | "sek" | "reps" | "km";
  primaryMuscles: string[];
  svgKey: string | null;
  imageUrl: string | null;
}

export interface BuilderItem {
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSeconds: number | null;
  restSeconds: number;
  progressionMode: ProgressionMode;
  /** Opens the workout rather than counting towards it — see the toggle below. */
  isWarmup: boolean;
}

export interface BuilderWorkout {
  id: string | null;
  name: string;
  description: string | null;
  goal: SaveWorkoutInput["goal"];
  level: SaveWorkoutInput["level"];
  estimatedMinutes: number;
  items: BuilderItem[];
}

/** Rough time estimate so the builder can show the cost of what you're adding. */
function estimateMinutes(items: BuilderItem[]): number {
  const seconds = items.reduce((sum, it) => {
    const work = it.targetSeconds ?? 35; // ~35 s for a set of reps
    return sum + it.targetSets * (work + it.restSeconds);
  }, 0);
  return Math.max(5, Math.round(seconds / 60));
}

/**
 * Program builder (spec §5, layer 2): assemble a workout from the exercise
 * library, tune sets/reps/rest per exercise, reorder, and save.
 *
 * Reordering uses explicit up/down buttons rather than drag-and-drop: it is
 * reliable with one thumb on a phone and accessible from the keyboard, which
 * matters more here than the drag gesture.
 */
export function WorkoutBuilder({
  initial,
  library,
  mediaPref = "illustration",
  onSave,
}: {
  initial: BuilderWorkout;
  library: BuilderLibraryExercise[];
  mediaPref?: MediaPref;
  onSave: (input: SaveWorkoutInput) => Promise<string>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [items, setItems] = useState<BuilderItem[]>(initial.items);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(library.map((e) => [e.id, e])), [library]);
  const minutes = estimateMinutes(items);
  const intensity = muscleIntensity(
    items.flatMap((it) => {
      const ex = byId.get(it.exerciseId);
      return ex ? [ex.primaryMuscles] : [];
    }),
  );

  const patch = (index: number, next: Partial<BuilderItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...next } : it)));

  const move = (index: number, delta: number) =>
    setItems((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });

  const add = (ex: BuilderLibraryExercise) => {
    const timed = ex.unit === "sek";
    setItems((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        targetSets: 3,
        targetRepsMin: timed ? null : 10,
        targetRepsMax: timed ? null : 12,
        targetSeconds: timed ? 30 : null,
        restSeconds: timed ? 45 : 90,
        progressionMode: timed ? "linear" : "double",
        isWarmup: false,
      },
    ]);
    setPicking(false);
    setQuery("");
  };

  function save() {
    setError(null);
    if (!name.trim()) {
      setError(t("errors.generic"));
      return;
    }
    startTransition(async () => {
      try {
        const id = await onSave({
          workoutId: initial.id,
          name: name.trim(),
          description: description.trim() || null,
          goal: initial.goal,
          level: initial.level,
          estimatedMinutes: minutes,
          items: items.map((it, i) => ({ ...it, order: i })),
        });
        router.push(`/library/workout/${id}`);
        router.refresh();
      } catch {
        setError(t("errors.generic"));
      }
    });
  }

  // ---- Exercise picker ----
  if (picking) {
    const filtered = library.filter((e) =>
      e.name.toLowerCase().includes(query.toLowerCase()),
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
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => add(e)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-elev p-3 text-left active:brightness-95"
              >
                <span className="h-10 w-12 shrink-0 rounded-lg bg-elev-2 p-1">
                  <ExerciseMedia
                    svgKey={e.svgKey}
                    imageUrl={e.imageUrl}
                    alt={e.name}
                    pref={mediaPref}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text">{e.name}</span>
                  <span className="block truncate text-xs text-faint">
                    {t(`muscles.${e.category}`)}
                  </span>
                </span>
                <PlusIcon size={18} className="shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" onClick={() => setPicking(false)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Input
        label={t("library.newWorkout")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
      />
      <Input
        label={t("train.note")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={200}
      />

      {/* Live estimate + muscle coverage */}
      <Card>
        <p className="mb-2 inline-flex items-center gap-1 text-sm text-muted">
          <ClockIcon size={15} /> {t("library.estMinutes", { min: minutes })}
        </p>
        <BodyMap intensity={intensity} />
      </Card>

      {/* Exercises */}
      <ul className="flex flex-col gap-3">
        {items.map((it, i) => {
          const ex = byId.get(it.exerciseId);
          if (!ex) return null;
          const timed = ex.unit === "sek";
          return (
            <li key={`${it.exerciseId}-${i}`} className="rounded-xl border border-border bg-elev p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-9 w-11 shrink-0 rounded-lg bg-elev-2 p-1">
                  <ExerciseMedia
                    svgKey={ex.svgKey}
                    imageUrl={ex.imageUrl}
                    alt={ex.name}
                    pref={mediaPref}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-text">{ex.name}</span>
                <button
                  type="button"
                  aria-label={t("common.previous")}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="h-8 w-8 rounded-lg border border-border text-muted disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={t("common.next")}
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="h-8 w-8 rounded-lg border border-border text-muted disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={t("common.remove")}
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="h-8 w-8 rounded-lg border border-border text-danger"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <NumField
                  label={t("common.sets")}
                  value={it.targetSets}
                  min={1}
                  max={10}
                  onChange={(v) => patch(i, { targetSets: v })}
                />
                {timed ? (
                  <NumField
                    label={t("common.sec")}
                    value={it.targetSeconds ?? 30}
                    min={5}
                    max={600}
                    step={5}
                    onChange={(v) => patch(i, { targetSeconds: v })}
                  />
                ) : (
                  <NumField
                    label={t("common.reps")}
                    value={it.targetRepsMax ?? 12}
                    min={1}
                    max={50}
                    onChange={(v) =>
                      patch(i, {
                        targetRepsMax: v,
                        targetRepsMin: Math.min(it.targetRepsMin ?? v, v),
                      })
                    }
                  />
                )}
                <NumField
                  label={t("common.rest")}
                  value={it.restSeconds}
                  min={0}
                  max={600}
                  step={15}
                  onChange={(v) => patch(i, { restSeconds: v })}
                />
              </div>

              {/* The row you start on. Marking it here means the toggle beside
                  "Log set" is already on when you get there, and the sets stay
                  out of your records and out of next time's suggestion. */}
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={it.isWarmup}
                  onChange={(e) => patch(i, { isWarmup: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                {t("library.warmupRow")}
              </label>
            </li>
          );
        })}
      </ul>

      <Button variant="secondary" onClick={() => setPicking(true)}>
        <PlusIcon size={18} /> {t("train.addExercise")}
      </Button>

      <Button size="lg" onClick={save} disabled={pending || items.length === 0}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

/** Compact number field with +/- steppers, sized for thumbs. */
function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-center text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label={`${label} −`}
          onClick={() => onChange(clamp(value - step))}
          className="grid h-9 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted"
        >
          <MinusIcon size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={String(value)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9]/g, ""));
            if (!Number.isNaN(n)) onChange(clamp(n));
          }}
          className={cn(
            "tabnum h-9 w-full rounded-lg border border-border bg-elev-2 text-center",
            "font-semibold text-text focus:border-accent focus:outline-none",
          )}
        />
        <button
          type="button"
          aria-label={`${label} +`}
          onClick={() => onChange(clamp(value + step))}
          className="grid h-9 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted"
        >
          <PlusIcon size={14} />
        </button>
      </div>
    </div>
  );
}
