import { getDb, newId, nowIso, type Row } from "../sqlite";
import type { ProgramSlot } from "@/lib/domain/program";

/**
 * Kvasir's plan.
 *
 * A plan is a running order over workouts that already exist. It never owns
 * training data and never copies a workout, so making, replacing or dropping a
 * plan cannot touch a logged session — the worst it can do is change what the
 * Train page suggests tomorrow.
 */

export interface Program {
  id: string;
  userId: string;
  name: string;
  goal: string;
  daysPerWeek: number;
  minutes: number;
  note: string | null;
  active: boolean;
  createdAt: string;
}

const mapProgram = (r: Row): Program => ({
  id: String(r.id),
  userId: String(r.user_id),
  name: String(r.name),
  goal: String(r.goal),
  daysPerWeek: Number(r.days_per_week ?? 3),
  minutes: Number(r.minutes ?? 45),
  note: r.note == null ? null : String(r.note),
  active: Number(r.active) === 1,
  createdAt: String(r.created_at),
});

export function getActiveProgram(userId: string): Program | null {
  const row = getDb()
    .prepare(
      "SELECT * FROM programs WHERE user_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId) as Row | undefined;
  return row ? mapProgram(row) : null;
}

export interface NewProgram {
  userId: string;
  name: string;
  goal?: string;
  daysPerWeek?: number;
  minutes?: number;
  note?: string | null;
  workoutIds: string[];
}

/**
 * Put a new plan in place.
 *
 * The previous one is retired rather than deleted: it is a record of what you
 * were doing, and someone will want to look back at why the training changed.
 */
export function createProgram(input: NewProgram): Program {
  const db = getDb();
  const id = newId();
  db.prepare("UPDATE programs SET active = 0 WHERE user_id = ?").run(input.userId);
  db.prepare(
    `INSERT INTO programs (id, user_id, name, goal, days_per_week, minutes, note, active, created_at)
     VALUES (?,?,?,?,?,?,?,1,?)`,
  ).run(
    id,
    input.userId,
    input.name,
    input.goal ?? "helkrop",
    input.daysPerWeek ?? 3,
    input.minutes ?? 45,
    input.note ?? null,
    nowIso(),
  );
  setProgramWorkouts(id, input.workoutIds);
  return getProgram(id)!;
}

export function getProgram(id: string): Program | null {
  const row = getDb().prepare("SELECT * FROM programs WHERE id = ?").get(id) as Row | undefined;
  return row ? mapProgram(row) : null;
}

/** Replace the running order. Only ever touches the plan, never the workouts. */
export function setProgramWorkouts(programId: string, workoutIds: string[]): void {
  const db = getDb();
  db.prepare("DELETE FROM program_workouts WHERE program_id = ?").run(programId);
  workoutIds.forEach((workoutId, i) => {
    db.prepare(
      "INSERT INTO program_workouts (id, program_id, workout_id, ord) VALUES (?,?,?,?)",
    ).run(newId(), programId, workoutId, i);
  });
}

export function listProgramWorkoutIds(programId: string): string[] {
  const rows = getDb()
    .prepare("SELECT workout_id FROM program_workouts WHERE program_id = ? ORDER BY ord")
    .all(programId) as Row[];
  return rows.map((r) => String(r.workout_id));
}

/**
 * The plan's running order with each workout's last session, ready for
 * `nextWorkout`. Archived workouts drop out: a plan should not send you to
 * something you have taken off your list.
 */
export function programSlots(programId: string, userId: string): ProgramSlot[] {
  const rows = getDb()
    .prepare(
      `SELECT pw.workout_id, pw.ord,
              (SELECT MAX(s.started_at) FROM sessions s
                WHERE s.workout_id = pw.workout_id AND s.user_id = ?) AS last_trained
       FROM program_workouts pw
       JOIN workouts w ON w.id = pw.workout_id
       WHERE pw.program_id = ? AND w.archived_at IS NULL
       ORDER BY pw.ord`,
    )
    .all(userId, programId) as Row[];
  return rows.map((r) => ({
    workoutId: String(r.workout_id),
    order: Number(r.ord),
    lastTrainedAt: r.last_trained == null ? null : String(r.last_trained),
  }));
}

/** Sessions in the last seven days — for how well the plan is being kept. */
export function sessionsLast7Days(userId: string, now = new Date()): number {
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND started_at >= ? AND ended_at IS NOT NULL",
    )
    .get(userId, since) as Row;
  return Number(row.n);
}
