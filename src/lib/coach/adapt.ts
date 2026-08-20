import "server-only";
import { chat, isAIConfigured, AIError } from "@/lib/ai/provider";
import { listExercises } from "@/lib/db/repo/exercises";
import { getWorkout, getWorkoutExercises } from "@/lib/db/repo/workouts";
import { listConstraints, addConstraint, type UserConstraint } from "@/lib/db/repo/constraints";
import { getUser } from "@/lib/db/repo/users";
import type { Exercise, ProgressionMode } from "@/lib/domain/types";

/**
 * Adapting a workout to an ailment or a wish (spec §7 + §17 "skader/smerte-log
 * med varsomme variant-forslag").
 *
 * The user says something in plain language — "min skulder gør ondt", "jeg vil
 * gerne have mere ryg", "jeg har kun 20 minutter" — and Kvasir proposes concrete
 * changes to the workout.
 *
 * Two hard rules:
 *   1. The model NEVER invents exercises. It may only choose from ids we give
 *      it, and every id it returns is validated against the library before the
 *      proposal is shown. An unknown id is dropped, not guessed at.
 *   2. The user always approves before anything is saved. Kvasir proposes; the
 *      human decides.
 */

export interface ProposedSwap {
  fromExerciseId: string;
  fromName: string;
  toExerciseId: string;
  toName: string;
  reason: string;
}

export interface ProposedAdjustment {
  exerciseId: string;
  name: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetSeconds?: number;
  restSeconds?: number;
  reason: string;
}

export interface ProposedRemoval {
  exerciseId: string;
  name: string;
  reason: string;
}

export interface AdaptationProposal {
  /** Kvasir's plain-language explanation, shown above the changes. */
  message: string;
  swaps: ProposedSwap[];
  adjustments: ProposedAdjustment[];
  removals: ProposedRemoval[];
  /** True when a language model produced this, false for the rule fallback. */
  fromModel: boolean;
  /** Set when the request mentioned pain, so the UI can show the medical note. */
  mentionsPain: boolean;
}

const PAIN_WORDS = [
  "smerte", "smerter", "ondt", "gør ondt", "øm", "ømt", "skade", "skadet",
  "stikker", "jag", "hugger", "forstuv", "seneskede", "diskus",
  "pain", "hurts", "sore", "injur", "strain", "ache",
];

export function mentionsPain(text: string): boolean {
  const lower = text.toLowerCase();
  return PAIN_WORDS.some((w) => lower.includes(w));
}

/** Muscle groups an exercise loads, used for safe substitution. */
function overlapScore(a: Exercise, b: Exercise): number {
  const setA = new Set(a.primaryMuscles);
  const shared = b.primaryMuscles.filter((m) => setA.has(m)).length;
  return shared + (a.category === b.category ? 1 : 0);
}

/**
 * Rule-based substitution: find the closest exercise that trains the same thing
 * with different (usually gentler) equipment. Used as the fallback when no model
 * is configured, and as the sanity check on whatever the model proposes.
 */
export function suggestAlternatives(
  exercise: Exercise,
  library: Exercise[],
  limit = 3,
): Exercise[] {
  return library
    .filter((e) => e.id !== exercise.id)
    .map((e) => ({ e, score: overlapScore(exercise, e) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      // Prefer the same muscles, then machines (most controlled), then easier.
      if (b.score !== a.score) return b.score - a.score;
      const machineFirst = (x: Exercise) => (x.equipment === "maskine" ? 0 : 1);
      const diff = machineFirst(a.e) - machineFirst(b.e);
      if (diff !== 0) return diff;
      const level = (x: Exercise) =>
        x.difficulty === "begynder" ? 0 : x.difficulty === "erfaren" ? 1 : 2;
      return level(a.e) - level(b.e);
    })
    .slice(0, limit)
    .map((x) => x.e);
}

/** Render the user's stored ailments and wishes for a prompt. */
export function describeConstraints(constraints: UserConstraint[]): string {
  if (constraints.length === 0) return "Ingen kendte skavanker eller ønsker.";
  return constraints
    .map((c) => `- ${c.kind === "skavank" ? "Skavank" : "Ønske"}: ${c.body}`)
    .join("\n");
}

interface ModelProposal {
  message?: string;
  swaps?: { from?: string; to?: string; reason?: string }[];
  adjustments?: {
    exercise?: string;
    sets?: number;
    reps_min?: number;
    reps_max?: number;
    seconds?: number;
    rest?: number;
    reason?: string;
  }[];
  removals?: { exercise?: string; reason?: string }[];
}

/** Pull the first JSON object out of a model reply, tolerating stray prose. */
function extractJson(text: string): ModelProposal | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as ModelProposal;
  } catch {
    return null;
  }
}

export interface AdaptInput {
  userId: string;
  workoutId: string;
  /** What the user wrote, e.g. "min skulder gør ondt når jeg presser". */
  request: string;
  /** Persist the request as a lasting constraint. */
  remember?: boolean;
}

/**
 * Ask Kvasir to adapt a specific workout to the user's request.
 *
 * Returns a *proposal* — nothing is written to the workout here.
 */
export async function adaptWorkout(input: AdaptInput): Promise<AdaptationProposal | null> {
  const user = getUser(input.userId);
  const workout = getWorkout(input.workoutId);
  if (!user || !workout) return null;

  const request = input.request.trim().slice(0, 500);
  if (!request) return null;

  const pain = mentionsPain(request);

  if (input.remember) {
    addConstraint({
      userId: input.userId,
      kind: pain ? "skavank" : "oenske",
      body: request,
      data: { workoutId: input.workoutId },
    });
  }

  const library = listExercises();
  const byId = new Map(library.map((e) => [e.id, e]));
  const items = getWorkoutExercises(workout.id);
  const current = items.flatMap((it) => {
    const ex = byId.get(it.exerciseId);
    return ex ? [{ item: it, ex }] : [];
  });
  if (current.length === 0) return null;

  const constraints = listConstraints(input.userId);

  // ---- Fallback: deterministic substitution ----
  const ruleProposal = (): AdaptationProposal => {
    const swaps: ProposedSwap[] = [];
    // Without a model we cannot tell *which* exercise hurts, so we offer the
    // gentlest alternative for the most demanding non-machine movements.
    for (const { ex } of current) {
      if (ex.equipment === "maskine" || ex.isBodyweight) continue;
      const alt = suggestAlternatives(ex, library, 1)[0];
      if (alt) {
        swaps.push({
          fromExerciseId: ex.id,
          fromName: ex.nameDa,
          toExerciseId: alt.id,
          toName: alt.nameDa,
          reason: alt.saferVariant ?? "Samme muskelgruppe med mere støtte.",
        });
      }
    }
    return {
      message: pain
        ? "Jeg er ikke koblet til en sprogmodel lige nu, men her er nogle mere skånsomme varianter. Gør det ondt, så drop øvelsen helt i dag — og få det set af en læge eller fysioterapeut hvis det bliver ved."
        : "Jeg er ikke koblet til en sprogmodel lige nu, men her er nogle nære alternativer du kan bytte til.",
      swaps: swaps.slice(0, 3),
      adjustments: [],
      removals: [],
      fromModel: false,
      mentionsPain: pain,
    };
  };

  if (!isAIConfigured()) return ruleProposal();

  // ---- Model path ----
  // The model may only pick from these ids; anything else is discarded.
  const libraryList = library
    .map((e) => `${e.id} | ${e.nameDa} | ${e.category} | ${e.equipment} | ${e.difficulty}`)
    .join("\n");
  const currentList = current
    .map(
      ({ item, ex }) =>
        `${ex.id} | ${ex.nameDa} | ${item.targetSets} sæt × ${
          item.targetSeconds ? `${item.targetSeconds}s` : `${item.targetRepsMin}-${item.targetRepsMax} reps`
        } | ${item.restSeconds}s hvil`,
    )
    .join("\n");

  const system = [
    "Du er Kvasir, træningscoach i appen Uruz. Du tilpasser en træning til brugerens skavank eller ønske.",
    "",
    "Svar KUN med et JSON-objekt i dette format — ingen tekst udenfor:",
    `{
  "message": "kort forklaring på dansk, maks 60 ord",
  "swaps": [{"from": "<øvelse-id fra træningen>", "to": "<øvelse-id fra biblioteket>", "reason": "kort begrundelse"}],
  "adjustments": [{"exercise": "<øvelse-id>", "sets": 2, "reps_min": 8, "reps_max": 12, "seconds": 30, "rest": 90, "reason": "kort begrundelse"}],
  "removals": [{"exercise": "<øvelse-id>", "reason": "kort begrundelse"}]
}`,
    "",
    "Regler:",
    "- Brug KUN id'er der står i listerne. Opfind aldrig et id eller et øvelsesnavn.",
    "- Lad felter du ikke vil ændre være udeladt. Tomme lister er fine.",
    "- Ved smerte: vælg skånsomme varianter (helst maskiner), sænk vægt/volumen, og skriv i 'message' at brugeren bør se en læge eller fysioterapeut hvis det fortsætter. Lov aldrig helbredelse.",
    "- Giv aldrig kost-, kalorie- eller kosttilskudsråd.",
    "- Hold ændringerne små og trygge. Højst 3 bytninger.",
  ].join("\n");

  const userMessage = [
    `Brugerens besked: ${request}`,
    "",
    "Kendte skavanker og ønsker:",
    describeConstraints(constraints),
    "",
    `Træningen "${workout.name}" indeholder nu (id | navn | mål | hvil):`,
    currentList,
    "",
    "Hele øvelsesbiblioteket (id | navn | kategori | udstyr | niveau):",
    libraryList,
  ].join("\n");

  try {
    const raw = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 4000, temperature: 0.4, timeoutMs: 120_000 },
    );

    const parsed = extractJson(raw);
    if (!parsed) throw new AIError("could not parse proposal");

    const inWorkout = new Set(current.map(({ ex }) => ex.id));

    // Validate every id against reality before it reaches the user.
    const swaps: ProposedSwap[] = (parsed.swaps ?? []).flatMap((s) => {
      const from = s.from ? byId.get(s.from) : undefined;
      const to = s.to ? byId.get(s.to) : undefined;
      if (!from || !to || !inWorkout.has(from.id) || from.id === to.id) return [];
      return [
        {
          fromExerciseId: from.id,
          fromName: from.nameDa,
          toExerciseId: to.id,
          toName: to.nameDa,
          reason: String(s.reason ?? "").slice(0, 200),
        },
      ];
    });

    const adjustments: ProposedAdjustment[] = (parsed.adjustments ?? []).flatMap((a) => {
      const ex = a.exercise ? byId.get(a.exercise) : undefined;
      if (!ex || !inWorkout.has(ex.id)) return [];
      const clamp = (v: number | undefined, lo: number, hi: number) =>
        typeof v === "number" && Number.isFinite(v)
          ? Math.min(hi, Math.max(lo, Math.round(v)))
          : undefined;
      return [
        {
          exerciseId: ex.id,
          name: ex.nameDa,
          targetSets: clamp(a.sets, 1, 10),
          targetRepsMin: clamp(a.reps_min, 1, 50),
          targetRepsMax: clamp(a.reps_max, 1, 50),
          targetSeconds: clamp(a.seconds, 5, 600),
          restSeconds: clamp(a.rest, 0, 600),
          reason: String(a.reason ?? "").slice(0, 200),
        },
      ];
    });

    const removals: ProposedRemoval[] = (parsed.removals ?? []).flatMap((r) => {
      const ex = r.exercise ? byId.get(r.exercise) : undefined;
      if (!ex || !inWorkout.has(ex.id)) return [];
      return [
        { exerciseId: ex.id, name: ex.nameDa, reason: String(r.reason ?? "").slice(0, 200) },
      ];
    });

    // Models routinely express "replace X" as both a swap AND a removal of X.
    // Taken literally the exercise would just vanish, since removals apply
    // first. A swap is the gentler, clearly-intended reading, so it wins.
    const swapped = new Set(swaps.map((s) => s.fromExerciseId));
    const deduped = removals.filter((r) => !swapped.has(r.exerciseId));

    // Never let the model empty the workout entirely.
    const remaining = current.length - deduped.length;
    const safeRemovals = remaining >= 1 ? deduped : [];

    return {
      message: String(parsed.message ?? "").slice(0, 600) || "Her er mit forslag.",
      swaps: swaps.slice(0, 3),
      adjustments: adjustments.slice(0, 6),
      removals: safeRemovals.slice(0, 2),
      fromModel: true,
      mentionsPain: pain,
    };
  } catch (err) {
    console.error("Kvasir adaptWorkout failed:", err instanceof AIError ? err.message : err);
    return ruleProposal();
  }
}

/** Apply a proposal to a list of workout items, returning the new list. */
export function applyProposal(
  items: {
    exerciseId: string;
    order: number;
    targetSets: number;
    targetRepsMin: number | null;
    targetRepsMax: number | null;
    targetSeconds: number | null;
    restSeconds: number;
    progressionMode: ProgressionMode;
  }[],
  proposal: Pick<AdaptationProposal, "swaps" | "adjustments" | "removals">,
) {
  const swapMap = new Map(proposal.swaps.map((s) => [s.fromExerciseId, s.toExerciseId]));
  // A swap always beats a removal for the same exercise (see adaptWorkout).
  const removed = new Set(
    proposal.removals.map((r) => r.exerciseId).filter((id) => !swapMap.has(id)),
  );
  const adjustMap = new Map(proposal.adjustments.map((a) => [a.exerciseId, a]));

  return items
    .filter((it) => !removed.has(it.exerciseId))
    .map((it) => {
      const adjust = adjustMap.get(it.exerciseId);
      const swapped = swapMap.get(it.exerciseId);
      return {
        ...it,
        exerciseId: swapped ?? it.exerciseId,
        targetSets: adjust?.targetSets ?? it.targetSets,
        targetRepsMin: adjust?.targetRepsMin ?? it.targetRepsMin,
        targetRepsMax: adjust?.targetRepsMax ?? it.targetRepsMax,
        targetSeconds: adjust?.targetSeconds ?? it.targetSeconds,
        restSeconds: adjust?.restSeconds ?? it.restSeconds,
      };
    })
    .map((it, i) => ({ ...it, order: i }));
}
