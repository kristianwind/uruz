import "server-only";
import { listBadges, setUserBadge, listUserBadges } from "@/lib/db/repo/badges";
import { listCompletedSessions, listSessionSets } from "@/lib/db/repo/sessions";
import { listExercises } from "@/lib/db/repo/exercises";
import { listHallUsers, updateUser } from "@/lib/db/repo/users";
import { getDb, type Row } from "@/lib/db/sqlite";
import { evaluateBadges, rankPoints, sortLeaderboard, type LeaderboardEntry } from "./gamification";
import { rankLevelFromPoints } from "./ranks";
import { lifetimeTotals, weekStreak, sessionsThisWeek, type SessionWithSets } from "./stats";
import type { Badge, UserBadge } from "@/lib/domain/types";

/**
 * Server-side glue between the pure gamification rules and the database.
 *
 * Awards are recomputed from history rather than incremented on the fly, so a
 * missed event, an edited set or an offline replay can never leave a user with
 * a wrong badge — the data is always the source of truth.
 */

export function loadUserData(userId: string): SessionWithSets[] {
  return listCompletedSessions(userId).map((session) => ({
    session,
    sets: listSessionSets(session.id),
  }));
}

export interface SyncResult {
  newlyEarned: Badge[];
  rankLevel: number;
  points: number;
}

/**
 * Recompute badges and rank for one user. Returns any badges earned *this*
 * call, so the caller can celebrate them exactly once.
 */
export function syncGamification(userId: string): SyncResult {
  const data = loadUserData(userId);
  const badges = listBadges();
  const exercises = listExercises();

  const tried = new Set<string>();
  for (const { sets } of data) for (const s of sets) tried.add(s.exerciseId);

  const before = new Map(listUserBadges(userId).map((b: UserBadge) => [b.badgeId, b]));
  const evaluations = evaluateBadges(badges, {
    data,
    libraryCount: exercises.length,
    triedExerciseIds: tried,
  });

  const bySlug = new Map(badges.map((b) => [b.slug, b]));
  const newlyEarned: Badge[] = [];

  for (const evaluation of evaluations) {
    const badge = bySlug.get(evaluation.slug);
    if (!badge) continue;
    const previous = before.get(badge.id);
    const wasEarned = !!previous?.earnedAt;
    setUserBadge(userId, badge.id, evaluation.progress, evaluation.earned);
    if (evaluation.earned && !wasEarned) newlyEarned.push(badge);
  }

  const points = rankPoints(data);
  const rankLevel = rankLevelFromPoints(points);
  updateUser(userId, { rankLevel });

  return { newlyEarned, rankLevel, points };
}

/** Build the hall leaderboard, honouring each member's privacy setting. */
export function buildLeaderboard(hallId: string): LeaderboardEntry[] {
  return listHallUsers(hallId)
    .filter((u) => u.isActive)
    .map((user) => {
      const data = loadUserData(user.id);
      const totals = lifetimeTotals(data);
      const streak = weekStreak(data);
      // Derive the rank from history rather than the stored column: the column
      // is only refreshed when *that* user opens the app, which would otherwise
      // show a hall-mate at a stale rank.
      const level = rankLevelFromPoints(rankPoints(data));
      return {
        userId: user.id,
        displayName: user.displayName,
        rankLevel: level,
        // Only aggregates leave this function — a private profile still takes
        // part in the hall's friendly competition without exposing raw logs.
        sessions: totals.sessions,
        volume: totals.volume,
        currentStreak: streak.currentWeeks,
        sessionsThisWeek: sessionsThisWeek(data),
      };
    });
}

export { sortLeaderboard };

/** Streak row for the user, kept in sync with what the history actually shows. */
export function syncStreak(userId: string): { current: number; longest: number } {
  const data = loadUserData(userId);
  const streak = weekStreak(data);
  const lastTrained = data.length ? data[data.length - 1].session.startedAt.slice(0, 10) : null;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM streaks WHERE user_id = ?").get(userId) as
    | Row
    | undefined;
  if (existing) {
    db.prepare(
      "UPDATE streaks SET current_days = ?, longest_days = ?, last_trained_on = ? WHERE user_id = ?",
    ).run(streak.currentWeeks, streak.longestWeeks, lastTrained, userId);
  }
  return { current: streak.currentWeeks, longest: streak.longestWeeks };
}
