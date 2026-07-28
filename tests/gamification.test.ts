import { describe, it, expect } from "vitest";
import {
  evaluateBadges,
  rankPoints,
  milestoneProgress,
  sortLeaderboard,
  travellerOfTheWeek,
  type LeaderboardEntry,
} from "@/lib/domain/gamification";
import { rankLevelFromPoints } from "@/lib/domain/ranks";
import type { Badge, Session, SetLog } from "@/lib/domain/types";
import type { SessionWithSets } from "@/lib/domain/stats";

let seq = 0;
function sws(startedAt: string, opts: { pr?: boolean; weight?: number; reps?: number } = {}): SessionWithSets {
  seq++;
  const session: Session = {
    id: `s${seq}`,
    userId: "u1",
    workoutId: null,
    startedAt,
    endedAt: new Date(new Date(startedAt).getTime() + 45 * 60000).toISOString(),
    mood: null,
    rpe: null,
    bodyweight: null,
    note: null,
  };
  const set: SetLog = {
    id: `l${seq}`,
    sessionId: session.id,
    exerciseId: "bench",
    setIndex: 0,
    weight: opts.weight ?? 60,
    reps: opts.reps ?? 10,
    seconds: null,
    isWarmup: false,
    isPr: opts.pr ?? false,
    rir: null,
    loggedAt: startedAt,
  };
  return { session, sets: [set] };
}

function badge(slug: string, criteriaJson: Record<string, unknown>): Badge {
  return {
    id: slug,
    slug,
    name: slug,
    description: "",
    runeSymbol: "ᚠ",
    tier: "bronze",
    criteriaJson,
  };
}

describe("evaluateBadges", () => {
  const ctx = (data: SessionWithSets[], tried: string[] = ["bench"], libraryCount = 4) => ({
    data,
    libraryCount,
    triedExerciseIds: new Set(tried),
  });

  it("awards a session-count badge once the count is reached", () => {
    const data = Array.from({ length: 10 }, (_, i) => sws(`2026-07-${10 + i}T10:00:00`));
    const result = evaluateBadges([badge("ten", { type: "sessions", count: 10 })], ctx(data));
    expect(result[0]).toMatchObject({ slug: "ten", earned: true, progress: 1 });
  });

  it("reports partial progress before the threshold", () => {
    const data = Array.from({ length: 5 }, (_, i) => sws(`2026-07-${10 + i}T10:00:00`));
    const result = evaluateBadges([badge("ten", { type: "sessions", count: 10 })], ctx(data));
    expect(result[0].earned).toBe(false);
    expect(result[0].progress).toBeCloseTo(0.5);
  });

  it("awards a PR badge from PR-flagged sets", () => {
    const data = [sws("2026-07-10T10:00:00", { pr: true })];
    const result = evaluateBadges([badge("firstPr", { type: "pr", count: 1 })], ctx(data));
    expect(result[0].earned).toBe(true);
  });

  it("awards the early-bird badge only for a session before the cutoff hour", () => {
    const late = evaluateBadges(
      [badge("early", { type: "before_hour", hour: 7 })],
      ctx([sws("2026-07-10T09:00:00")]),
    );
    expect(late[0].earned).toBe(false);

    const early = evaluateBadges(
      [badge("early", { type: "before_hour", hour: 7 })],
      ctx([sws("2026-07-10T06:30:00")]),
    );
    expect(early[0].earned).toBe(true);
  });

  it("tracks progress through the whole exercise library", () => {
    const data = [sws("2026-07-10T10:00:00")];
    const partial = evaluateBadges(
      [badge("all", { type: "all_exercises" })],
      ctx(data, ["a", "b"], 4),
    );
    expect(partial[0].progress).toBeCloseTo(0.5);

    const complete = evaluateBadges(
      [badge("all", { type: "all_exercises" })],
      ctx(data, ["a", "b", "c", "d"], 4),
    );
    expect(complete[0].earned).toBe(true);
  });

  it("awards a week-streak badge from the longest streak", () => {
    const data = [
      sws("2026-07-29T10:00:00"),
      sws("2026-07-22T10:00:00"),
      sws("2026-07-15T10:00:00"),
    ];
    const result = evaluateBadges([badge("streak3", { type: "week_streak", count: 3 })], ctx(data));
    expect(result[0].earned).toBe(true);
  });

  it("gives no progress for an unknown criteria type", () => {
    const result = evaluateBadges([badge("weird", { type: "nonsense" })], ctx([]));
    expect(result[0]).toMatchObject({ progress: 0, earned: false });
  });
});

describe("rankPoints", () => {
  it("weights attendance most heavily", () => {
    const attendance = Array.from({ length: 10 }, (_, i) => sws(`2026-07-${10 + i}T10:00:00`));
    const withPrs = [sws("2026-07-10T10:00:00", { pr: true })];
    expect(rankPoints(attendance)).toBeGreaterThan(rankPoints(withPrs));
  });

  it("is zero with no history", () => {
    expect(rankPoints([])).toBe(0);
  });
});

describe("rankLevelFromPoints", () => {
  it("starts at the lowest rank", () => {
    expect(rankLevelFromPoints(0)).toBe(0);
  });

  it("climbs monotonically and caps at the top rank", () => {
    const levels = [0, 5, 20, 50, 100, 200, 10_000].map(rankLevelFromPoints);
    expect(levels).toEqual([0, 1, 2, 3, 4, 5, 5]);
  });
});

describe("milestoneProgress", () => {
  it("reports the next milestone before any is passed", () => {
    const result = milestoneProgress(500);
    expect(result.passed).toBeNull();
    expect(result.next?.key).toBe("car");
    expect(result.progressToNext).toBeCloseTo(500 / 1400);
  });

  it("reports the highest milestone passed", () => {
    const result = milestoneProgress(20_000);
    expect(result.passed?.key).toBe("bus");
    expect(result.next?.key).toBe("house");
  });

  it("caps out at the final milestone", () => {
    const result = milestoneProgress(10_000_000);
    expect(result.next).toBeNull();
    expect(result.progressToNext).toBe(1);
  });
});

describe("leaderboard", () => {
  const entries: LeaderboardEntry[] = [
    { userId: "a", displayName: "Kristian", rankLevel: 1, sessions: 20, volume: 50_000, currentStreak: 3, sessionsThisWeek: 1 },
    { userId: "b", displayName: "Ib", rankLevel: 2, sessions: 25, volume: 40_000, currentStreak: 5, sessionsThisWeek: 2 },
  ];

  it("sorts by the requested metric", () => {
    expect(sortLeaderboard(entries, "sessions")[0].userId).toBe("b");
    expect(sortLeaderboard(entries, "volume")[0].userId).toBe("a");
    expect(sortLeaderboard(entries, "streak")[0].userId).toBe("b");
  });

  it("does not mutate the input", () => {
    const copy = [...entries];
    sortLeaderboard(entries, "volume");
    expect(entries).toEqual(copy);
  });

  it("picks the traveller of the week", () => {
    expect(travellerOfTheWeek(entries)?.userId).toBe("b");
  });

  it("has no traveller when nobody trained this week", () => {
    const idle = entries.map((e) => ({ ...e, sessionsThisWeek: 0 }));
    expect(travellerOfTheWeek(idle)).toBeNull();
  });
});
