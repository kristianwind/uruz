import type { Badge } from "./types";
import { lifetimeTotals, weekStreak, type SessionWithSets } from "./stats";

/**
 * Gamification rules (spec §6/§9): badges, rank points and milestones.
 *
 * Pure functions over training data — the same input always yields the same
 * awards, which makes the rules testable and means a badge can never be
 * "half-awarded" by a race in the UI.
 */

export interface BadgeContext {
  data: SessionWithSets[];
  /** Number of distinct exercises available in the library. */
  libraryCount: number;
  /** Distinct exercise ids the user has actually logged. */
  triedExerciseIds: Set<string>;
}

export interface BadgeEvaluation {
  slug: string;
  /** 0..1 — how far toward earning it. */
  progress: number;
  earned: boolean;
}

/**
 * Evaluate every badge against the user's history.
 *
 * Criteria live in the badge row (`criteria_json`) so new badges can be seeded
 * without a deploy; this function only knows how to interpret the criteria
 * *types*.
 */
export function evaluateBadges(badges: Badge[], ctx: BadgeContext): BadgeEvaluation[] {
  const totals = lifetimeTotals(ctx.data);
  const streak = weekStreak(ctx.data);

  // Earliest local hour the user has ever started a session.
  let earliestHour = 24;
  for (const { session } of ctx.data) {
    const hour = new Date(session.startedAt).getHours();
    if (hour < earliestHour) earliestHour = hour;
  }

  return badges.map((badge) => {
    const criteria = badge.criteriaJson as Record<string, unknown>;
    const type = String(criteria.type ?? "");
    const target = Number(criteria.count ?? 0);

    const ratio = (value: number, goal: number) =>
      goal <= 0 ? 0 : Math.min(1, value / goal);

    let progress = 0;
    switch (type) {
      case "sessions":
        progress = ratio(totals.sessions, target);
        break;
      case "pr":
        progress = ratio(totals.prs, target);
        break;
      case "week_streak":
        progress = ratio(streak.longestWeeks, target);
        break;
      case "before_hour": {
        const hour = Number(criteria.hour ?? 7);
        progress = earliestHour < hour ? 1 : 0;
        break;
      }
      case "all_exercises":
        progress = ratio(ctx.triedExerciseIds.size, ctx.libraryCount);
        break;
      default:
        progress = 0;
    }

    return { slug: badge.slug, progress, earned: progress >= 1 };
  });
}

/**
 * Rank points (spec §9). Deliberately weighted toward *showing up*: attendance
 * is worth the most, records and streaks add flavour on top.
 */
export function rankPoints(data: SessionWithSets[]): number {
  const totals = lifetimeTotals(data);
  const streak = weekStreak(data);
  return totals.sessions * 2 + totals.prs * 1 + streak.longestWeeks * 3;
}

// ---- Milestones ----------------------------------------------------------

export interface Milestone {
  /** Translation key suffix. */
  key: string;
  emoji: string;
  /** Threshold in kilograms of lifetime tonnage. */
  kg: number;
}

/** Symbolic tonnage milestones — the "you've now lifted an X" celebrations. */
export const MILESTONES: Milestone[] = [
  { key: "car", emoji: "🚗", kg: 1_400 },
  { key: "elephant", emoji: "🐘", kg: 5_000 },
  { key: "bus", emoji: "🚌", kg: 12_000 },
  { key: "house", emoji: "🏠", kg: 50_000 },
  { key: "ship", emoji: "🚢", kg: 100_000 },
  { key: "whale", emoji: "🐋", kg: 150_000 },
  { key: "spaceship", emoji: "🚀", kg: 500_000 },
];

/** The highest milestone passed, and the next one to chase. */
export function milestoneProgress(totalKg: number): {
  passed: Milestone | null;
  next: Milestone | null;
  progressToNext: number;
} {
  const passed = [...MILESTONES].reverse().find((m) => totalKg >= m.kg) ?? null;
  const next = MILESTONES.find((m) => totalKg < m.kg) ?? null;
  const floor = passed?.kg ?? 0;
  const progressToNext = next
    ? Math.min(1, Math.max(0, (totalKg - floor) / (next.kg - floor)))
    : 1;
  return { passed, next, progressToNext };
}

// ---- Leaderboard ---------------------------------------------------------

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  rankLevel: number;
  /** Aggregates only — safe to show even for a private profile. */
  sessions: number;
  volume: number;
  currentStreak: number;
  sessionsThisWeek: number;
}

/**
 * Rank hall members for Valhal. Sorted by the metric asked for; ties fall back
 * to total sessions so the order is stable.
 */
export function sortLeaderboard(
  entries: LeaderboardEntry[],
  by: "sessions" | "volume" | "streak" | "week",
): LeaderboardEntry[] {
  const value = (e: LeaderboardEntry) =>
    by === "volume"
      ? e.volume
      : by === "streak"
        ? e.currentStreak
        : by === "week"
          ? e.sessionsThisWeek
          : e.sessions;
  return [...entries].sort((a, b) => value(b) - value(a) || b.sessions - a.sessions);
}

/**
 * "Traveller of the week": most sessions this week, requiring at least one so
 * an empty week has no winner.
 */
export function travellerOfTheWeek(entries: LeaderboardEntry[]): LeaderboardEntry | null {
  const best = sortLeaderboard(entries, "week")[0];
  return best && best.sessionsThisWeek > 0 ? best : null;
}
