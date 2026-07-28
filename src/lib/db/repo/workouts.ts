import { getDb, fromBool, newId, nowIso, type Row } from "../sqlite";
import { mapWorkout, mapWorkoutExercise } from "../mappers";
import type { Workout, WorkoutExercise } from "@/lib/domain/types";

export function getWorkout(id: string): Workout | null {
  const row = getDb().prepare("SELECT * FROM workouts WHERE id = ?").get(id) as Row | undefined;
  return row ? mapWorkout(row) : null;
}

/** Templates + the hall's own workouts, visible to everyone in the hall. */
export function listHallWorkouts(hallId: string): Workout[] {
  const rows = getDb()
    .prepare("SELECT * FROM workouts WHERE hall_id = ? ORDER BY is_template DESC, name")
    .all(hallId) as Row[];
  return rows.map(mapWorkout);
}

export function listTemplates(hallId: string): Workout[] {
  const rows = getDb()
    .prepare("SELECT * FROM workouts WHERE hall_id = ? AND is_template = 1 ORDER BY name")
    .all(hallId) as Row[];
  return rows.map(mapWorkout);
}

export function getWorkoutExercises(workoutId: string): WorkoutExercise[] {
  const rows = getDb()
    .prepare("SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY ord")
    .all(workoutId) as Row[];
  return rows.map(mapWorkoutExercise);
}

export interface WorkoutInput {
  id?: string;
  hallId: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  goal?: Workout["goal"];
  level?: Workout["level"];
  estimatedMinutes?: number;
  isTemplate?: boolean;
  createdBy?: string | null;
}

export function createWorkout(input: WorkoutInput): Workout {
  const id = input.id ?? newId();
  getDb()
    .prepare(
      `INSERT INTO workouts
        (id, hall_id, name, name_en, description, description_en, goal, level,
         estimated_minutes, is_template, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.hallId,
      input.name,
      input.nameEn ?? null,
      input.description ?? null,
      input.descriptionEn ?? null,
      input.goal ?? "helkrop",
      input.level ?? "begynder",
      input.estimatedMinutes ?? 45,
      fromBool(input.isTemplate ?? false),
      input.createdBy ?? null,
      nowIso(),
    );
  return getWorkout(id)!;
}

export function updateWorkoutMeta(
  id: string,
  patch: Partial<Pick<WorkoutInput, "name" | "description" | "goal" | "level" | "estimatedMinutes">>,
): Workout | null {
  const cols: Record<string, string> = {
    name: "name",
    description: "description",
    goal: "goal",
    level: "level",
    estimatedMinutes: "estimated_minutes",
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!cols[k]) continue;
    sets.push(`${cols[k]} = ?`);
    values.push(v);
  }
  if (!sets.length) return getWorkout(id);
  values.push(id);
  getDb().prepare(`UPDATE workouts SET ${sets.join(", ")} WHERE id = ?`).run(...(values as never[]));
  return getWorkout(id);
}

export function deleteWorkout(id: string): void {
  getDb().prepare("DELETE FROM workouts WHERE id = ?").run(id);
}

export interface WorkoutExerciseInput {
  id?: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  targetSets?: number;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  targetSeconds?: number | null;
  restSeconds?: number;
  progressionMode?: WorkoutExercise["progressionMode"];
  notes?: string | null;
}

export function addWorkoutExercise(input: WorkoutExerciseInput): WorkoutExercise {
  const id = input.id ?? newId();
  getDb()
    .prepare(
      `INSERT INTO workout_exercises
        (id, workout_id, exercise_id, ord, target_sets, target_reps_min,
         target_reps_max, target_seconds, rest_seconds, progression_mode, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.workoutId,
      input.exerciseId,
      input.order,
      input.targetSets ?? 3,
      input.targetRepsMin ?? null,
      input.targetRepsMax ?? null,
      input.targetSeconds ?? null,
      input.restSeconds ?? 90,
      input.progressionMode ?? "double",
      input.notes ?? null,
    );
  const row = getDb()
    .prepare("SELECT * FROM workout_exercises WHERE id = ?")
    .get(id) as Row;
  return mapWorkoutExercise(row);
}

/** Replace the whole exercise list for a workout (used by the builder). */
export function setWorkoutExercises(
  workoutId: string,
  items: Omit<WorkoutExerciseInput, "workoutId">[],
): WorkoutExercise[] {
  const db = getDb();
  db.prepare("DELETE FROM workout_exercises WHERE workout_id = ?").run(workoutId);
  items.forEach((it, i) =>
    addWorkoutExercise({ ...it, workoutId, order: it.order ?? i }),
  );
  return getWorkoutExercises(workoutId);
}
