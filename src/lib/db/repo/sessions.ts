import { getDb, fromBool, newId, nowIso, type Row } from "../sqlite";
import { mapPersonalRecord, mapSession, mapSetLog } from "../mappers";
import type { PersonalRecord, PRType, Session, SetLog } from "@/lib/domain/types";
import { prCandidatesForSet, newRecords } from "@/lib/domain/strength";

/**
 * Training sessions and set logs — the core write path of the app.
 *
 * `logSet` is deliberately synchronous and cheap: it inserts the set, detects
 * personal records in the same transaction, and returns what was beaten so the
 * UI can celebrate immediately. Sub-2s logging (spec §6) depends on this staying
 * a single fast round-trip.
 */

// ---- Sessions ------------------------------------------------------------

export function getSession(id: string): Session | null {
  const row = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Row | undefined;
  return row ? mapSession(row) : null;
}

/** The user's currently-open session, if any (started but not ended). */
export function getActiveSession(userId: string): Session | null {
  const row = getDb()
    .prepare(
      "SELECT * FROM sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    )
    .get(userId) as Row | undefined;
  return row ? mapSession(row) : null;
}

export function listSessions(userId: string, limit = 50): Session[] {
  const rows = getDb()
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?")
    .all(userId, limit) as Row[];
  return rows.map(mapSession);
}

/** All completed sessions for a user, oldest first — used by stats. */
export function listCompletedSessions(userId: string): Session[] {
  const rows = getDb()
    .prepare("SELECT * FROM sessions WHERE user_id = ? AND ended_at IS NOT NULL ORDER BY started_at")
    .all(userId) as Row[];
  return rows.map(mapSession);
}

export function startSession(
  userId: string,
  workoutId: string | null,
  id: string = newId(),
): Session {
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, workout_id, started_at) VALUES (?,?,?,?)")
    .run(id, userId, workoutId, nowIso());
  return getSession(id)!;
}

export interface FinishSessionInput {
  mood?: number | null;
  rpe?: number | null;
  bodyweight?: number | null;
  note?: string | null;
}

export function finishSession(id: string, input: FinishSessionInput = {}): Session | null {
  getDb()
    .prepare(
      "UPDATE sessions SET ended_at = ?, mood = ?, rpe = ?, bodyweight = ?, note = ? WHERE id = ?",
    )
    .run(
      nowIso(),
      input.mood ?? null,
      input.rpe ?? null,
      input.bodyweight ?? null,
      input.note ?? null,
      id,
    );
  return getSession(id);
}

/**
 * Delete a whole session and everything logged in it.
 *
 * The user id is part of the WHERE clause rather than a lookup followed by a
 * check: no window in between, and somebody else's id simply matches nothing.
 * Returns whether a row actually went, so a route cannot answer "deleted" for
 * a session that was never there.
 */
export function deleteSessionOwned(id: string, userId: string): boolean {
  const res = getDb()
    .prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return Number(res.changes) > 0;
}

export function deleteSession(id: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

// ---- Set logs ------------------------------------------------------------

export function listSessionSets(sessionId: string): SetLog[] {
  const rows = getDb()
    .prepare("SELECT * FROM set_logs WHERE session_id = ? ORDER BY logged_at, set_index")
    .all(sessionId) as Row[];
  return rows.map(mapSetLog);
}

export function getSetLog(id: string): SetLog | null {
  const row = getDb().prepare("SELECT * FROM set_logs WHERE id = ?").get(id) as Row | undefined;
  return row ? mapSetLog(row) : null;
}

export interface LogSetInput {
  /** Client-generated id so offline-queued sets stay idempotent on replay. */
  id?: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weight?: number | null;
  reps?: number | null;
  seconds?: number | null;
  isWarmup?: boolean;
  rir?: number | null;
}

export interface LogSetResult {
  set: SetLog;
  /** Records beaten by this set (empty when nothing was beaten). */
  records: { type: PRType; value: number }[];
  /** True when the set already existed (idempotent offline replay). */
  duplicate: boolean;
}

/**
 * Log one set, detect personal records, and persist any that were beaten.
 *
 * Idempotent by set id: replaying a queued offline set never double-inserts or
 * re-awards a record.
 */
export function logSet(userId: string, input: LogSetInput): LogSetResult {
  const db = getDb();
  const id = input.id ?? newId();

  const existing = getSetLog(id);
  if (existing) return { set: existing, records: [], duplicate: true };

  const isWarmup = input.isWarmup ?? false;
  const loggedAt = nowIso();

  const candidates = prCandidatesForSet({
    weight: input.weight ?? null,
    reps: input.reps ?? null,
    seconds: input.seconds ?? null,
    isWarmup,
  });
  const current = currentBests(userId, input.exerciseId);
  const beaten = newRecords(candidates, current);

  db.prepare(
    `INSERT INTO set_logs
      (id, session_id, exercise_id, set_index, weight, reps, seconds, is_warmup, is_pr, rir, logged_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    input.sessionId,
    input.exerciseId,
    input.setIndex,
    input.weight ?? null,
    input.reps ?? null,
    input.seconds ?? null,
    fromBool(isWarmup),
    fromBool(beaten.length > 0),
    input.rir ?? null,
    loggedAt,
  );

  for (const rec of beaten) {
    upsertPersonalRecord(userId, input.exerciseId, rec.type, rec.value, input.sessionId, loggedAt);
  }

  return { set: getSetLog(id)!, records: beaten, duplicate: false };
}

export interface UpdateSetInput {
  weight?: number | null;
  reps?: number | null;
  seconds?: number | null;
  isWarmup?: boolean;
  rir?: number | null;
}

/** Correct a mistyped set after the fact (spec §6: "Rediger bagefter"). */
export function updateSet(id: string, patch: UpdateSetInput): SetLog | null {
  const cols: Record<string, string> = {
    weight: "weight",
    reps: "reps",
    seconds: "seconds",
    isWarmup: "is_warmup",
    rir: "rir",
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!cols[k]) continue;
    sets.push(`${cols[k]} = ?`);
    values.push(typeof v === "boolean" ? fromBool(v) : v);
  }
  if (!sets.length) return getSetLog(id);
  values.push(id);
  getDb().prepare(`UPDATE set_logs SET ${sets.join(", ")} WHERE id = ?`).run(...(values as never[]));
  return getSetLog(id);
}

export function deleteSet(id: string): void {
  getDb().prepare("DELETE FROM set_logs WHERE id = ?").run(id);
}

/** True when the set belongs to a session owned by this user. */
export function userOwnsSet(userId: string, setId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM set_logs sl
       JOIN sessions s ON s.id = sl.session_id
       WHERE sl.id = ? AND s.user_id = ?`,
    )
    .get(setId, userId) as Row | undefined;
  return !!row;
}

// ---- Personal records ----------------------------------------------------

/** Current best value per PR type for a user+exercise. */
export function currentBests(
  userId: string,
  exerciseId: string,
): Partial<Record<PRType, number>> {
  const rows = getDb()
    .prepare(
      "SELECT type, MAX(value) AS best FROM personal_records WHERE user_id = ? AND exercise_id = ? GROUP BY type",
    )
    .all(userId, exerciseId) as Row[];
  const out: Partial<Record<PRType, number>> = {};
  for (const r of rows) out[String(r.type) as PRType] = Number(r.best);
  return out;
}

function upsertPersonalRecord(
  userId: string,
  exerciseId: string,
  type: PRType,
  value: number,
  sessionId: string | null,
  achievedAt: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO personal_records (id, user_id, exercise_id, type, value, achieved_at, session_id)
       VALUES (?,?,?,?,?,?,?)`,
    )
    .run(newId(), userId, exerciseId, type, value, achievedAt, sessionId);
}

export function listPersonalRecords(userId: string): PersonalRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM personal_records WHERE user_id = ? ORDER BY achieved_at DESC")
    .all(userId) as Row[];
  return rows.map(mapPersonalRecord);
}

// ---- History helpers -----------------------------------------------------

export interface LastPerformance {
  weight: number | null;
  reps: number[];
  seconds: number | null;
  rir: number | null;
  performedAt: string;
}

/**
 * The user's most recent working sets for an exercise — used to prefill the
 * logging screen ("samme som sidst") and to drive progression suggestions.
 */
export function getLastPerformance(
  userId: string,
  exerciseId: string,
  excludeSessionId?: string,
): LastPerformance | null {
  const db = getDb();
  const sessionRow = db
    .prepare(
      `SELECT s.id, s.started_at FROM sessions s
       JOIN set_logs sl ON sl.session_id = s.id
       WHERE s.user_id = ? AND sl.exercise_id = ? AND sl.is_warmup = 0
         AND (? IS NULL OR s.id != ?)
       ORDER BY s.started_at DESC LIMIT 1`,
    )
    .get(userId, exerciseId, excludeSessionId ?? null, excludeSessionId ?? "") as Row | undefined;
  if (!sessionRow) return null;

  const rows = db
    .prepare(
      `SELECT * FROM set_logs WHERE session_id = ? AND exercise_id = ? AND is_warmup = 0
       ORDER BY set_index`,
    )
    .all(String(sessionRow.id), exerciseId) as Row[];
  if (rows.length === 0) return null;

  const sets = rows.map(mapSetLog);
  return {
    weight: sets[0].weight,
    reps: sets.map((s) => s.reps ?? 0),
    seconds: sets[0].seconds,
    rir: sets[sets.length - 1].rir,
    performedAt: String(sessionRow.started_at),
  };
}
