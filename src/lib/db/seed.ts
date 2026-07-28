import { getDb } from "./sqlite";
import { getAnyHall, createHall } from "./repo/halls";
import { upsertExercise, getExerciseBySlug } from "./repo/exercises";
import { upsertBadge } from "./repo/badges";
import {
  createWorkout,
  addWorkoutExercise,
  listTemplates,
} from "./repo/workouts";
import { createUser, getUserByEmail } from "./repo/users";
import { createInvitation, getInvitationByCode } from "./repo/invitations";
import { SEED_EXERCISES, SEED_TEMPLATES, SEED_BADGES } from "./seed-data";
import type { Hall } from "@/lib/domain/types";
import { t } from "@/lib/i18n/core";

export interface SeedResult {
  hall: Hall;
  exercises: number;
  templates: number;
  badges: number;
  demoCreated: boolean;
}

/**
 * Idempotent seed of the shared content: exercise library, workout templates
 * and badges. Optionally seeds a demo admin (Kristian) + a pending invitation
 * for Ib so the app is explorable immediately (spec §15).
 *
 * @param opts.demo  When true, create the demo admin + pending invite.
 */
export function seed(opts: { demo?: boolean } = {}): SeedResult {
  const hall = getAnyHall() ?? createHall(t("auth.defaultHallName"));

  // Exercises (upsert by slug — safe to re-run).
  for (const ex of SEED_EXERCISES) {
    upsertExercise({
      ...ex,
      imageUrl: null,
      demoVideoUrl: null,
      createdBy: null,
      isPublic: true,
    });
  }

  // Badges (upsert by slug).
  for (const b of SEED_BADGES) upsertBadge(b);

  // Templates — only create the ones that don't already exist by name.
  const existing = new Set(listTemplates(hall.id).map((t) => t.name));
  let templatesCreated = 0;
  for (const tpl of SEED_TEMPLATES) {
    if (existing.has(tpl.name)) continue;
    const workout = createWorkout({
      hallId: hall.id,
      name: tpl.name,
      nameEn: tpl.nameEn,
      description: tpl.description,
      descriptionEn: tpl.descriptionEn,
      goal: tpl.goal,
      level: tpl.level,
      estimatedMinutes: tpl.estimatedMinutes,
      isTemplate: true,
    });
    tpl.exercises.forEach((te, i) => {
      const ex = getExerciseBySlug(te.slug);
      if (!ex) return;
      addWorkoutExercise({
        workoutId: workout.id,
        exerciseId: ex.id,
        order: i,
        targetSets: te.targetSets,
        targetRepsMin: te.targetRepsMin ?? null,
        targetRepsMax: te.targetRepsMax ?? null,
        targetSeconds: te.targetSeconds ?? null,
        restSeconds: te.restSeconds,
        progressionMode: te.progressionMode ?? (te.targetSeconds ? "linear" : "double"),
      });
    });
    templatesCreated++;
  }

  let demoCreated = false;
  if (opts.demo) {
    const adminEmail = process.env.URUZ_ADMIN_EMAIL || "kristian@uruz.local";
    let admin = getUserByEmail(adminEmail);
    if (!admin) {
      admin = createUser({
        hallId: hall.id,
        email: adminEmail,
        displayName: "Kristian",
        role: "admin",
      });
      demoCreated = true;
    }
    // Pending invitation for Ib with a fixed, easy demo code.
    if (!getInvitationByCode("IBIBIBIB")) {
      createInvitation({
        hallId: hall.id,
        email: "ib@uruz.local",
        invitedBy: admin.id,
        role: "member",
        code: "IBIBIBIB",
      });
    }
  }

  return {
    hall,
    exercises: SEED_EXERCISES.length,
    templates: templatesCreated,
    badges: SEED_BADGES.length,
    demoCreated,
  };
}

/** Convenience for scripts: ensure the DB/schema exist before seeding. */
export function ensureSchema(): void {
  getDb();
}
