import type { Session, SetLog, Exercise } from "./types";
import { estimate1RM, setVolume } from "./strength";

/**
 * Statistics aggregation — pure functions over sessions and set logs.
 *
 * Nothing here touches the database or React, so every number the user sees can
 * be unit-tested. The UI layer only formats what these return.
 *
 * All week handling uses ISO weeks (Monday start), which is what Danes expect.
 */

// ---- Date helpers --------------------------------------------------------

/** Local YYYY-MM-DD for a date or ISO string (never UTC-shifted). */
export function dayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the ISO week containing `value`, as a YYYY-MM-DD key. */
export function weekKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : new Date(value);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return dayKey(d);
}

export function monthKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive list of day keys between two dates. */
export function dayRange(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    out.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// ---- Core aggregates -----------------------------------------------------

export interface SessionWithSets {
  session: Session;
  sets: SetLog[];
}

/** Tonnage (kg lifted) for a session, excluding warm-ups. */
export function sessionVolume(sets: SetLog[]): number {
  return sets.reduce((sum, s) => (s.isWarmup ? sum : sum + setVolume(s)), 0);
}

export interface TimeBucket {
  key: string;
  volume: number;
  sessions: number;
  sets: number;
}

/** Group sessions into buckets (week or month) with volume and counts. */
export function bucketByPeriod(
  data: SessionWithSets[],
  period: "week" | "month",
): TimeBucket[] {
  const keyFor = period === "week" ? weekKey : monthKey;
  const map = new Map<string, TimeBucket>();
  for (const { session, sets } of data) {
    const key = keyFor(session.startedAt);
    const bucket = map.get(key) ?? { key, volume: 0, sessions: 0, sets: 0 };
    bucket.volume += sessionVolume(sets);
    bucket.sessions += 1;
    bucket.sets += sets.filter((s) => !s.isWarmup).length;
    map.set(key, bucket);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface ExerciseProgressPoint {
  date: string;
  /** Heaviest working weight that day. */
  topWeight: number;
  /** Best estimated 1RM that day. */
  best1RM: number;
  /** Total volume for the exercise that day. */
  volume: number;
  /** Longest hold, for timed exercises. */
  bestSeconds: number;
}

/** Per-session progress for one exercise, oldest first. */
export function exerciseProgress(
  data: SessionWithSets[],
  exerciseId: string,
): ExerciseProgressPoint[] {
  const points: ExerciseProgressPoint[] = [];
  for (const { session, sets } of data) {
    const relevant = sets.filter((s) => s.exerciseId === exerciseId && !s.isWarmup);
    if (relevant.length === 0) continue;
    points.push({
      date: dayKey(session.startedAt),
      topWeight: Math.max(0, ...relevant.map((s) => s.weight ?? 0)),
      best1RM: Math.max(
        0,
        ...relevant.map((s) => estimate1RM(s.weight ?? 0, s.reps ?? 0)),
      ),
      volume: relevant.reduce((sum, s) => sum + setVolume(s), 0),
      bestSeconds: Math.max(0, ...relevant.map((s) => s.seconds ?? 0)),
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Muscle balance ------------------------------------------------------

export interface MuscleVolume {
  muscle: string;
  volume: number;
  sets: number;
}

/**
 * Volume per muscle group. A set's volume is credited to every primary muscle
 * of the exercise — this measures *exposure*, not a physiological split, and is
 * what makes "much pressing, little pulling" visible.
 */
export function volumeByMuscle(
  data: SessionWithSets[],
  exercises: Map<string, Exercise>,
): MuscleVolume[] {
  const map = new Map<string, MuscleVolume>();
  for (const { sets } of data) {
    for (const s of sets) {
      if (s.isWarmup) continue;
      const ex = exercises.get(s.exerciseId);
      if (!ex) continue;
      const vol = setVolume(s);
      for (const muscle of ex.primaryMuscles) {
        const entry = map.get(muscle) ?? { muscle, volume: 0, sets: 0 };
        entry.volume += vol;
        entry.sets += 1;
        map.set(muscle, entry);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume);
}

export interface BalanceCheck {
  pushSets: number;
  pullSets: number;
  legSets: number;
  coreSets: number;
  /** push:pull ratio; 1 is balanced, >1 means push-dominant. */
  pushPullRatio: number;
  /** True when the imbalance is worth mentioning to the user. */
  imbalanced: boolean;
}

/** Push vs pull vs legs balance, by working-set count (spec §13). */
export function balanceCheck(
  data: SessionWithSets[],
  exercises: Map<string, Exercise>,
): BalanceCheck {
  let pushSets = 0;
  let pullSets = 0;
  let legSets = 0;
  let coreSets = 0;
  for (const { sets } of data) {
    for (const s of sets) {
      if (s.isWarmup) continue;
      const ex = exercises.get(s.exerciseId);
      if (!ex) continue;
      if (ex.category === "pres") pushSets++;
      else if (ex.category === "traek") pullSets++;
      else if (ex.category === "ben") legSets++;
      else if (ex.category === "kerne") coreSets++;
    }
  }
  const ratio = pullSets === 0 ? (pushSets > 0 ? Infinity : 1) : pushSets / pullSets;
  return {
    pushSets,
    pullSets,
    legSets,
    coreSets,
    pushPullRatio: ratio,
    // Flag only with enough data to be meaningful.
    imbalanced: pushSets + pullSets >= 10 && (ratio >= 1.6 || ratio <= 0.625),
  };
}

// ---- Attendance ----------------------------------------------------------

export interface AttendanceDay {
  date: string;
  sessions: number;
  volume: number;
}

/** Calendar heatmap data for the last `days` days, including empty days. */
export function attendanceHeatmap(
  data: SessionWithSets[],
  days = 120,
  today = new Date(),
): AttendanceDay[] {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const keys = dayRange(from, today);

  const map = new Map<string, AttendanceDay>();
  for (const key of keys) map.set(key, { date: key, sessions: 0, volume: 0 });
  for (const { session, sets } of data) {
    const key = dayKey(session.startedAt);
    const entry = map.get(key);
    if (!entry) continue;
    entry.sessions += 1;
    entry.volume += sessionVolume(sets);
  }
  return keys.map((k) => map.get(k)!);
}

/** Sessions in the current ISO week. */
export function sessionsThisWeek(data: SessionWithSets[], today = new Date()): number {
  const current = weekKey(today);
  return data.filter((d) => weekKey(d.session.startedAt) === current).length;
}

/**
 * Consistency score 0..100 — how reliably the user shows up against their
 * weekly goal over the last `weeks` weeks. Showing up is what the app rewards
 * most (spec §13), so this is deliberately about frequency, not load.
 */
export function consistencyScore(
  data: SessionWithSets[],
  weeklyGoal = 2,
  weeks = 8,
  today = new Date(),
): number {
  if (weeklyGoal <= 0) return 0;
  const buckets = new Map<string, number>();
  for (const { session } of data) {
    const key = weekKey(session.startedAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  let total = 0;
  const cursor = new Date(today);
  for (let i = 0; i < weeks; i++) {
    const key = weekKey(cursor);
    const done = buckets.get(key) ?? 0;
    total += Math.min(1, done / weeklyGoal);
    cursor.setDate(cursor.getDate() - 7);
  }
  return Math.round((total / weeks) * 100);
}

// ---- Streaks -------------------------------------------------------------

export interface StreakInfo {
  /** Consecutive weeks (ending this week or last) with at least one session. */
  currentWeeks: number;
  longestWeeks: number;
}

/**
 * Week-based streaks. Weeks are more forgiving than days for a 2-3x/week
 * lifter, and the current streak survives an in-progress week with no session
 * yet — the week isn't over, so it hasn't been missed.
 */
export function weekStreak(data: SessionWithSets[], today = new Date()): StreakInfo {
  const weeks = new Set(data.map((d) => weekKey(d.session.startedAt)));
  if (weeks.size === 0) return { currentWeeks: 0, longestWeeks: 0 };

  // Current streak: walk back from this week.
  let current = 0;
  const cursor = new Date(today);
  if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7); // grace for the running week
  while (weeks.has(weekKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 7);
  }

  // Longest streak: sort the distinct weeks and count consecutive runs.
  const sorted = [...weeks].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 7);
    if (dayKey(prev) === sorted[i]) run++;
    else run = 1;
    longest = Math.max(longest, run);
  }
  return { currentWeeks: current, longestWeeks: Math.max(longest, current) };
}

// ---- Fun insights (spec §13) --------------------------------------------

export interface FunnyUnit {
  /** Translation key suffix, e.g. "elephant". */
  key: string;
  emoji: string;
  kg: number;
}

/**
 * Reference weights for translating tonnage into something imaginable.
 * Deliberately concrete and a bit silly — this is the motivation layer.
 */
export const FUNNY_UNITS: FunnyUnit[] = [
  { key: "cat", emoji: "🐈", kg: 4.5 },
  { key: "sack", emoji: "🎒", kg: 25 },
  { key: "human", emoji: "🧍", kg: 80 },
  { key: "fridge", emoji: "🧊", kg: 120 },
  { key: "polarBear", emoji: "🐻‍❄️", kg: 450 },
  { key: "horse", emoji: "🐎", kg: 500 },
  { key: "car", emoji: "🚗", kg: 1400 },
  { key: "elephant", emoji: "🐘", kg: 5000 },
  { key: "bus", emoji: "🚌", kg: 12000 },
  { key: "whale", emoji: "🐋", kg: 150000 },
];

/** Pick the unit that makes the total read best (a count between 1 and 100). */
export function funnyUnitFor(totalKg: number): { unit: FunnyUnit; count: number } | null {
  if (totalKg <= 0) return null;
  const candidates = FUNNY_UNITS.filter((u) => totalKg / u.kg >= 1);
  const unit =
    [...candidates].reverse().find((u) => totalKg / u.kg <= 100) ??
    candidates[candidates.length - 1] ??
    FUNNY_UNITS[0];
  return { unit, count: Math.round((totalKg / unit.kg) * 10) / 10 };
}

export interface OnThisDay {
  exerciseId: string;
  weeksAgo: number;
  thenWeight: number;
  nowWeight: number;
  percentChange: number;
}

/**
 * "On this day": compare the most recent top weight for an exercise against
 * roughly `weeksAgo` weeks earlier — the single most motivating stat there is.
 */
export function onThisDay(
  data: SessionWithSets[],
  exerciseId: string,
  weeksAgo = 4,
  today = new Date(),
): OnThisDay | null {
  const points = exerciseProgress(data, exerciseId);
  if (points.length < 2) return null;

  const now = points[points.length - 1];
  const target = new Date(today);
  target.setDate(target.getDate() - weeksAgo * 7);
  const targetKey = dayKey(target);

  // Closest session at or before the target date.
  const past = [...points].reverse().find((p) => p.date <= targetKey);
  if (!past || past.topWeight <= 0 || past.date === now.date) return null;

  return {
    exerciseId,
    weeksAgo,
    thenWeight: past.topWeight,
    nowWeight: now.topWeight,
    percentChange: Math.round(((now.topWeight - past.topWeight) / past.topWeight) * 100),
  };
}

export interface ExerciseFrequency {
  exerciseId: string;
  sessions: number;
}

/** Most- and least-trained exercises (the "mest oversprungne" insight). */
export function exerciseFrequency(data: SessionWithSets[]): ExerciseFrequency[] {
  const map = new Map<string, number>();
  for (const { sets } of data) {
    const seen = new Set<string>();
    for (const s of sets) {
      if (s.isWarmup || seen.has(s.exerciseId)) continue;
      seen.add(s.exerciseId);
      map.set(s.exerciseId, (map.get(s.exerciseId) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([exerciseId, sessions]) => ({ exerciseId, sessions }))
    .sort((a, b) => b.sessions - a.sessions);
}

export interface PeriodComparison {
  current: number;
  previous: number;
  percentChange: number | null;
}

/** This period vs the one before (volume). Null change when there's no baseline. */
export function compareVolume(
  data: SessionWithSets[],
  period: "week" | "month",
  today = new Date(),
): PeriodComparison {
  const keyFor = period === "week" ? weekKey : monthKey;
  const currentKey = keyFor(today);
  const prevDate = new Date(today);
  if (period === "week") prevDate.setDate(prevDate.getDate() - 7);
  else prevDate.setMonth(prevDate.getMonth() - 1);
  const previousKey = keyFor(prevDate);

  let current = 0;
  let previous = 0;
  for (const { session, sets } of data) {
    const key = keyFor(session.startedAt);
    const vol = sessionVolume(sets);
    if (key === currentKey) current += vol;
    else if (key === previousKey) previous += vol;
  }
  return {
    current,
    previous,
    percentChange: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

export interface BodyweightPoint {
  date: string;
  weight: number;
}

/** Bodyweight trend from the optional per-session reading. */
export function bodyweightTrend(data: SessionWithSets[]): BodyweightPoint[] {
  return data
    .filter((d) => d.session.bodyweight && d.session.bodyweight > 0)
    .map((d) => ({ date: dayKey(d.session.startedAt), weight: d.session.bodyweight! }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface MoodPoint {
  date: string;
  mood: number | null;
  rpe: number | null;
  volume: number;
}

/** Mood and effort over time, alongside the volume actually lifted. */
export function moodTrend(data: SessionWithSets[]): MoodPoint[] {
  return data
    .filter((d) => d.session.mood !== null || d.session.rpe !== null)
    .map((d) => ({
      date: dayKey(d.session.startedAt),
      mood: d.session.mood,
      rpe: d.session.rpe,
      volume: sessionVolume(d.sets),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Strength standards --------------------------------------------------

export type StrengthLevel = "begynder" | "oevet" | "avanceret";

/**
 * Rough strength standards as a multiple of bodyweight, per exercise category.
 *
 * These are deliberately conservative, coarse buckets meant to give a beginner
 * a sense of scale — not a competition standard. Machine lifts vary wildly
 * between manufacturers, so this is presented as an indication only.
 */
const STANDARDS: Record<string, { oevet: number; avanceret: number }> = {
  ben: { oevet: 1.5, avanceret: 2.5 },
  pres: { oevet: 0.75, avanceret: 1.25 },
  traek: { oevet: 0.75, avanceret: 1.25 },
  kerne: { oevet: 0.5, avanceret: 1.0 },
  kondi: { oevet: 0.5, avanceret: 1.0 },
};

export function strengthLevel(
  category: string,
  best1RM: number,
  bodyweight: number,
): StrengthLevel | null {
  if (!bodyweight || bodyweight <= 0 || best1RM <= 0) return null;
  const std = STANDARDS[category];
  if (!std) return null;
  const ratio = best1RM / bodyweight;
  if (ratio >= std.avanceret) return "avanceret";
  if (ratio >= std.oevet) return "oevet";
  return "begynder";
}

// ---- Totals --------------------------------------------------------------

export interface LifetimeTotals {
  sessions: number;
  sets: number;
  reps: number;
  volume: number;
  minutes: number;
  prs: number;
}

export function lifetimeTotals(data: SessionWithSets[]): LifetimeTotals {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  let minutes = 0;
  let prs = 0;
  for (const { session, sets: logs } of data) {
    for (const s of logs) {
      if (s.isWarmup) continue;
      sets++;
      reps += s.reps ?? 0;
      volume += setVolume(s);
      if (s.isPr) prs++;
    }
    if (session.endedAt) {
      minutes +=
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000;
    }
  }
  return {
    sessions: data.length,
    sets,
    reps,
    volume,
    minutes: Math.round(minutes),
    prs,
  };
}
