"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import {
  createWorkout,
  getWorkout,
  getWorkoutExercises,
  setWorkoutExercises,
  updateWorkoutMeta,
  deleteWorkout,
} from "@/lib/db/repo/workouts";
import { workoutName } from "@/lib/domain/localize";
import { applyProposal } from "@/lib/coach/adapt";
import { getLocale } from "@/lib/i18n/server";

/**
 * Library mutations. Everything here is hall-scoped and checked server-side:
 * a user may only touch workouts belonging to their own hall.
 */

const ItemSchema = z.object({
  exerciseId: z.string().min(1),
  order: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(20),
  targetRepsMin: z.number().int().min(1).max(200).nullable(),
  targetRepsMax: z.number().int().min(1).max(200).nullable(),
  targetSeconds: z.number().int().min(1).max(3600).nullable(),
  restSeconds: z.number().int().min(0).max(900),
  progressionMode: z.enum(["double", "linear", "rir", "none"]),
});

const SaveSchema = z.object({
  workoutId: z.string().min(1).nullable(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable(),
  goal: z.enum(["styrke", "udholdenhed", "helkrop", "split", "kondi"]),
  level: z.enum(["begynder", "erfaren", "pro"]),
  estimatedMinutes: z.number().int().min(5).max(240),
  items: z.array(ItemSchema).max(40),
});

export type SaveWorkoutInput = z.infer<typeof SaveSchema>;

/** Create or update one of the hall's own workouts. Returns its id. */
export async function saveWorkoutAction(input: SaveWorkoutInput): Promise<string> {
  const ctx = await requireContext();
  const parsed = SaveSchema.parse(input);

  let workoutId = parsed.workoutId;
  if (workoutId) {
    const existing = getWorkout(workoutId);
    if (!existing || existing.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");
    // Seeded templates are shared content — only an admin may rewrite them.
    if (existing.isTemplate && ctx.user.role !== "admin") throw new Error("FORBIDDEN");
    updateWorkoutMeta(workoutId, {
      name: parsed.name,
      description: parsed.description,
      goal: parsed.goal,
      level: parsed.level,
      estimatedMinutes: parsed.estimatedMinutes,
    });
  } else {
    const created = createWorkout({
      hallId: ctx.hall.id,
      name: parsed.name,
      description: parsed.description,
      goal: parsed.goal,
      level: parsed.level,
      estimatedMinutes: parsed.estimatedMinutes,
      isTemplate: false,
      createdBy: ctx.user.id,
    });
    workoutId = created.id;
  }

  setWorkoutExercises(workoutId, parsed.items);
  revalidatePath("/library");
  revalidatePath("/train");
  return workoutId;
}

/**
 * Copy a workout into the hall as an editable, non-template workout — the
 * "dublér & justér" flow (spec §5): take a template, tweak it, save as your own.
 */
export async function duplicateWorkoutAction(workoutId: string): Promise<string> {
  const ctx = await requireContext();
  const source = getWorkout(workoutId);
  if (!source || source.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");

  const locale = await getLocale(ctx.user.localePref);
  const baseName = workoutName(source, locale);
  const copy = createWorkout({
    hallId: ctx.hall.id,
    name: `${baseName} (kopi)`,
    description: source.description,
    goal: source.goal,
    level: source.level,
    estimatedMinutes: source.estimatedMinutes,
    isTemplate: false,
    createdBy: ctx.user.id,
  });

  setWorkoutExercises(
    copy.id,
    getWorkoutExercises(source.id).map((it) => ({
      exerciseId: it.exerciseId,
      order: it.order,
      targetSets: it.targetSets,
      targetRepsMin: it.targetRepsMin,
      targetRepsMax: it.targetRepsMax,
      targetSeconds: it.targetSeconds,
      restSeconds: it.restSeconds,
      progressionMode: it.progressionMode,
      notes: it.notes,
    })),
  );

  revalidatePath("/library");
  return copy.id;
}

/** Delete one of the hall's own workouts (never a seeded template). */
export async function deleteWorkoutAction(workoutId: string): Promise<void> {
  const ctx = await requireContext();
  const workout = getWorkout(workoutId);
  if (!workout || workout.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");
  if (workout.isTemplate && ctx.user.role !== "admin") throw new Error("FORBIDDEN");
  deleteWorkout(workoutId);
  revalidatePath("/library");
  revalidatePath("/train");
}

// ---- Mimir adaptation ----------------------------------------------------

const ProposalSchema = z.object({
  swaps: z.array(
    z.object({
      fromExerciseId: z.string().min(1),
      toExerciseId: z.string().min(1),
      fromName: z.string().default(""),
      toName: z.string().default(""),
      reason: z.string().default(""),
    }),
  ),
  adjustments: z.array(
    z.object({
      exerciseId: z.string().min(1),
      name: z.string().default(""),
      targetSets: z.number().int().min(1).max(10).optional(),
      targetRepsMin: z.number().int().min(1).max(50).optional(),
      targetRepsMax: z.number().int().min(1).max(50).optional(),
      targetSeconds: z.number().int().min(5).max(600).optional(),
      restSeconds: z.number().int().min(0).max(600).optional(),
      reason: z.string().default(""),
    }),
  ),
  removals: z.array(
    z.object({
      exerciseId: z.string().min(1),
      name: z.string().default(""),
      reason: z.string().default(""),
    }),
  ),
});

export type AdaptationProposalInput = z.infer<typeof ProposalSchema>;

/**
 * Apply a Mimir proposal by saving an *adjusted copy* of the workout.
 *
 * Never edits the original: the user keeps their known-good programme, and an
 * adaptation for a sore shoulder does not silently become the permanent plan.
 */
export async function applyAdaptationAction(input: {
  workoutId: string;
  proposal: z.infer<typeof ProposalSchema>;
  name?: string;
}): Promise<string> {
  const ctx = await requireContext();
  const source = getWorkout(input.workoutId);
  if (!source || source.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");

  const proposal = ProposalSchema.parse(input.proposal);
  const items = getWorkoutExercises(source.id).map((it) => ({
    exerciseId: it.exerciseId,
    order: it.order,
    targetSets: it.targetSets,
    targetRepsMin: it.targetRepsMin,
    targetRepsMax: it.targetRepsMax,
    targetSeconds: it.targetSeconds,
    restSeconds: it.restSeconds,
    progressionMode: it.progressionMode,
  }));

  const next = applyProposal(items, proposal);
  if (next.length === 0) throw new Error("EMPTY_WORKOUT");

  const locale = await getLocale(ctx.user.localePref);
  const copy = createWorkout({
    hallId: ctx.hall.id,
    name: input.name?.trim() || `${workoutName(source, locale)} (tilpasset)`,
    description: source.description,
    goal: source.goal,
    level: source.level,
    estimatedMinutes: source.estimatedMinutes,
    isTemplate: false,
    createdBy: ctx.user.id,
  });

  setWorkoutExercises(copy.id, next);
  revalidatePath("/library");
  revalidatePath("/train");
  return copy.id;
}
