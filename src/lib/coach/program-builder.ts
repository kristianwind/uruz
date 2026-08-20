import "server-only";
import { chat, isAIConfigured, AIError } from "@/lib/ai/provider";
import { listExercises } from "@/lib/db/repo/exercises";
import { listConstraints } from "@/lib/db/repo/constraints";
import { createWorkout, setWorkoutExercises } from "@/lib/db/repo/workouts";
import { createProgram, type Program } from "@/lib/db/repo/programs";
import type { Exercise } from "@/lib/domain/types";

/**
 * Kvasir builds the plan.
 *
 * The app could always store a workout; what it could not do was answer "what
 * should I be doing?". Asked five plain questions, Kvasir now answers it with a
 * real plan — a handful of workouts in a running order — instead of handing
 * over a catalogue and a builder.
 *
 * Two rules shape everything here. The plan may only use exercises that exist
 * in the library, because a program naming equipment the gym does not have is
 * worse than no program. And it must produce something usable with no model
 * configured at all: the rule-based fallback is not a degraded mode, it is the
 * floor.
 */

export interface ProgramWish {
  /** What they are after, in their own words — free text, may be empty. */
  goal: string;
  daysPerWeek: number;
  minutes: number;
  /** Slugs of equipment they have; empty means assume an ordinary gym. */
  equipment: string[];
}

export interface BuiltProgram {
  program: Program;
  /** True when a model shaped it, false for the rule-based floor. */
  fromModel: boolean;
  /** Kvasir's own short explanation, shown with the plan. */
  note: string;
}

interface ModelPlan {
  name?: string;
  note?: string;
  workouts?: {
    name?: string;
    exercises?: { slug?: string; sets?: number; reps?: number; warmup?: boolean }[];
  }[];
}

/** Pull the first JSON object out of a reply, tolerating stray prose. */
function extractJson(text: string): ModelPlan | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as ModelPlan;
  } catch {
    return null;
  }
}

/**
 * How many workouts a plan should hold.
 *
 * Two to four. Fewer than two is not a rotation; more than four and the days
 * come round so rarely that nothing gets trained often enough to progress.
 */
export function workoutCountFor(daysPerWeek: number): number {
  if (daysPerWeek <= 2) return 2;
  if (daysPerWeek >= 5) return 4;
  return 3;
}

/**
 * The rule-based plan: full-body days drawn from what the library actually has,
 * balanced across the movement categories rather than piling on one.
 *
 * This is what runs when no model is configured, and it is also the shape the
 * model is asked to improve on — so a bad model answer costs polish, not a
 * working plan.
 */
export function planFromRules(
  exercises: Exercise[],
  wish: ProgramWish,
): { name: string; exercises: { exercise: Exercise; sets: number; warmup: boolean }[] }[] {
  const available = exercises.filter(
    (e) => wish.equipment.length === 0 || wish.equipment.includes(e.equipment),
  );
  const pool = available.length > 0 ? available : exercises;

  const byCategory = (c: string) => pool.filter((e) => e.category === c);
  // A day is built from the movement patterns, so no single day is all pressing.
  const order = ["ben", "pres", "traek", "kerne"];
  const count = workoutCountFor(wish.daysPerWeek);
  // Roughly one exercise per eight minutes, floored at three so a short day is
  // still a workout and capped so a long one does not become a marathon.
  const perDay = Math.max(3, Math.min(7, Math.round(wish.minutes / 8)));

  const cardio = byCategory("kondi")[0];

  return Array.from({ length: count }, (_, day) => {
    const picked: { exercise: Exercise; sets: number; warmup: boolean }[] = [];
    if (cardio) picked.push({ exercise: cardio, sets: 1, warmup: true });

    for (let i = 0; picked.length < perDay + (cardio ? 1 : 0); i++) {
      const category = order[i % order.length];
      const inCategory = byCategory(category);
      if (inCategory.length === 0) continue;
      // Rotate the choice per day so day 2 is not day 1 again.
      const choice = inCategory[(Math.floor(i / order.length) + day) % inCategory.length];
      if (choice && !picked.some((p) => p.exercise.id === choice.id)) {
        picked.push({ exercise: choice, sets: 3, warmup: false });
      }
      if (i > 40) break; // the library is finite; do not spin on it
    }

    return { name: `${wish.goal || "Helkrop"} ${String.fromCharCode(65 + day)}`, exercises: picked };
  });
}

/**
 * Ask Kvasir for a plan, then save it.
 *
 * The workouts are created as ordinary hall workouts, so everything that
 * already works — editing, adapting, the archive — works on them too. Nothing
 * about this is a special case the rest of the app has to know about.
 */
export async function buildProgram(
  userId: string,
  hallId: string,
  wish: ProgramWish,
): Promise<BuiltProgram> {
  const exercises = listExercises();
  const constraints = listConstraints(userId);
  const fallback = planFromRules(exercises, wish);

  let plan = fallback;
  let name = wish.goal.trim() || "Mit program";
  let note = "Bygget efter dine svar: hele kroppen fordelt over ugen, med opvarmning først.";
  let fromModel = false;

  if (isAIConfigured()) {
    try {
      const reply = await chat(
        [
          {
            role: "system",
            content: [
              "Du er Kvasir, træningscoachen i appen Uruz.",
              "Du lægger et træningsprogram og svarer KUN med JSON — ingen forklaring udenfor.",
              "Du må udelukkende bruge øvelser fra listen, og du skal skrive deres slug præcist.",
              "Format:",
              '{"name":"...","note":"kort begrundelse på dansk, maks 30 ord",',
              '"workouts":[{"name":"...","exercises":[{"slug":"...","sets":3,"reps":10,"warmup":false}]}]}',
              "Første øvelse i hver træning bør være kondi med warmup=true.",
              "Aldrig lægevidenskabelige råd. Tag hensyn til skavanker ved at undgå de øvelser der gør ondt.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Mål: ${wish.goal || "generel styrke"}`,
              `Dage om ugen: ${wish.daysPerWeek}`,
              `Minutter pr. gang: ${wish.minutes}`,
              `Antal træninger i rotationen: ${workoutCountFor(wish.daysPerWeek)}`,
              "",
              "Skavanker og ønsker:",
              constraints.length
                ? constraints.map((c) => `- [${c.kind}] ${c.body}`).join("\n")
                : "- ingen",
              "",
              "Tilgængelige øvelser (slug | navn | kategori | udstyr):",
              ...exercises.map(
                (e) => `${e.slug} | ${e.nameDa} | ${e.category} | ${e.equipment}`,
              ),
              "",
              "Læg programmet.",
            ].join("\n"),
          },
        ],
        { maxTokens: 4000, temperature: 0.4, timeoutMs: 120_000 },
      );

      const parsed = extractJson(reply);
      const bySlug = new Map(exercises.map((e) => [e.slug, e]));
      const converted = (parsed?.workouts ?? [])
        .map((w) => ({
          name: (w.name ?? "").trim() || "Træning",
          exercises: (w.exercises ?? [])
            // A slug the library does not have is dropped rather than guessed at.
            .map((x) => ({
              exercise: bySlug.get(String(x.slug ?? "")),
              sets: Math.min(6, Math.max(1, Number(x.sets) || 3)),
              warmup: x.warmup === true,
            }))
            .filter((x): x is { exercise: Exercise; sets: number; warmup: boolean } =>
              Boolean(x.exercise),
            ),
        }))
        .filter((w) => w.exercises.length >= 2);

      // Only take the model's plan if it survived validation intact enough to
      // train from. Half a plan is worse than the rule-based one.
      if (converted.length >= 2) {
        plan = converted;
        name = (parsed?.name ?? "").trim() || name;
        note = (parsed?.note ?? "").trim() || note;
        fromModel = true;
      }
    } catch (err) {
      // A model that is down must not stop you getting a plan.
      if (!(err instanceof AIError)) throw err;
    }
  }

  const workoutIds = plan.map((day) => {
    const workout = createWorkout({
      hallId,
      name: day.name,
      goal: "helkrop",
      level: "begynder",
      estimatedMinutes: wish.minutes,
      isTemplate: false,
      createdBy: userId,
    });
    setWorkoutExercises(
      workout.id,
      day.exercises.map((e, i) => ({
        exerciseId: e.exercise.id,
        order: i,
        targetSets: e.sets,
        targetRepsMin: e.exercise.unit === "kg" ? 8 : null,
        targetRepsMax: e.exercise.unit === "kg" ? 12 : null,
        targetSeconds: e.exercise.unit === "sek" ? 30 : null,
        restSeconds: e.warmup ? 60 : 90,
        isWarmup: e.warmup,
      })),
    );
    return workout.id;
  });

  const program = createProgram({
    userId,
    name,
    goal: wish.goal || "helkrop",
    daysPerWeek: wish.daysPerWeek,
    minutes: wish.minutes,
    note,
    workoutIds,
  });

  return { program, fromModel, note };
}
