import { describe, it, expect } from "vitest";
import {
  dayKey,
  weekKey,
  bucketByPeriod,
  exerciseProgress,
  volumeByMuscle,
  balanceCheck,
  attendanceHeatmap,
  sessionsThisWeek,
  consistencyScore,
  weekStreak,
  funnyUnitFor,
  onThisDay,
  exerciseFrequency,
  compareVolume,
  bodyweightTrend,
  strengthLevel,
  lifetimeTotals,
  type SessionWithSets,
} from "@/lib/domain/stats";
import type { Exercise, Session, SetLog } from "@/lib/domain/types";

// ---- fixtures ------------------------------------------------------------

let seq = 0;
function session(startedAt: string, extra: Partial<Session> = {}): Session {
  seq++;
  return {
    id: `s${seq}`,
    userId: "u1",
    workoutId: null,
    startedAt,
    endedAt: extra.endedAt ?? new Date(new Date(startedAt).getTime() + 45 * 60000).toISOString(),
    mood: null,
    rpe: null,
    bodyweight: null,
    note: null,
    ...extra,
  };
}

function set(exerciseId: string, weight: number, reps: number, extra: Partial<SetLog> = {}): SetLog {
  seq++;
  return {
    id: `l${seq}`,
    sessionId: "s",
    exerciseId,
    setIndex: 0,
    weight,
    reps,
    seconds: null,
    isWarmup: false,
    isPr: false,
    rir: null,
    loggedAt: new Date().toISOString(),
    ...extra,
  };
}

function exercise(id: string, category: Exercise["category"], muscles: string[]): Exercise {
  return {
    id,
    slug: id,
    nameDa: id,
    nameEn: id,
    category,
    primaryMuscles: muscles,
    equipment: "maskine",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [],
    instructionsStepsEn: [],
    cues: [],
    cuesEn: [],
    saferVariant: null,
    saferVariantEn: null,
    svgKey: null,
    imageUrl: null,
    difficulty: "begynder",
    demoVideoUrl: null,
    createdBy: null,
    isPublic: true,
  };
}

const EXERCISES = new Map<string, Exercise>([
  ["bench", exercise("bench", "pres", ["bryst", "triceps"])],
  ["row", exercise("row", "traek", ["ryg", "biceps"])],
  ["squat", exercise("squat", "ben", ["forlaar"])],
]);

// ---- date helpers --------------------------------------------------------

describe("date keys", () => {
  it("formats a local day key without UTC drift", () => {
    // Late evening local time must still report that same calendar day.
    expect(dayKey(new Date(2026, 6, 27, 23, 30))).toBe("2026-07-27");
  });

  it("anchors weeks to Monday", () => {
    // 2026-07-27 is a Monday; the Sunday after belongs to the same week.
    expect(weekKey(new Date(2026, 6, 27))).toBe("2026-07-27");
    expect(weekKey(new Date(2026, 7, 2))).toBe("2026-07-27");
    // The next Monday starts a new week.
    expect(weekKey(new Date(2026, 7, 3))).toBe("2026-08-03");
  });
});

// ---- aggregation ---------------------------------------------------------

describe("bucketByPeriod", () => {
  it("sums volume per week and counts sessions", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-27T10:00:00"), sets: [set("bench", 60, 10)] },
      { session: session("2026-07-29T10:00:00"), sets: [set("bench", 60, 10)] },
      { session: session("2026-08-03T10:00:00"), sets: [set("bench", 70, 10)] },
    ];
    const weeks = bucketByPeriod(data, "week");
    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ key: "2026-07-27", volume: 1200, sessions: 2 });
    expect(weeks[1]).toMatchObject({ key: "2026-08-03", volume: 700, sessions: 1 });
  });

  it("excludes warm-up sets from volume", () => {
    const data: SessionWithSets[] = [
      {
        session: session("2026-07-27T10:00:00"),
        sets: [set("bench", 20, 10, { isWarmup: true }), set("bench", 60, 10)],
      },
    ];
    expect(bucketByPeriod(data, "week")[0].volume).toBe(600);
  });
});

describe("exerciseProgress", () => {
  it("tracks top weight and estimated 1RM per session", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00"), sets: [set("bench", 60, 10)] },
      { session: session("2026-07-08T10:00:00"), sets: [set("bench", 65, 10), set("bench", 65, 8)] },
    ];
    const points = exerciseProgress(data, "bench");
    expect(points).toHaveLength(2);
    expect(points[0].topWeight).toBe(60);
    expect(points[1].topWeight).toBe(65);
    expect(points[1].best1RM).toBeCloseTo(65 * (1 + 10 / 30), 6);
    expect(points[1].volume).toBe(65 * 10 + 65 * 8);
  });

  it("ignores other exercises", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00"), sets: [set("row", 50, 10)] },
    ];
    expect(exerciseProgress(data, "bench")).toEqual([]);
  });
});

describe("volumeByMuscle", () => {
  it("credits every primary muscle of the exercise", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00"), sets: [set("bench", 60, 10)] },
    ];
    const byMuscle = volumeByMuscle(data, EXERCISES);
    expect(byMuscle.find((m) => m.muscle === "bryst")?.volume).toBe(600);
    expect(byMuscle.find((m) => m.muscle === "triceps")?.volume).toBe(600);
  });
});

describe("balanceCheck", () => {
  it("does not flag an imbalance without enough data", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00"), sets: [set("bench", 60, 10)] },
    ];
    expect(balanceCheck(data, EXERCISES).imbalanced).toBe(false);
  });

  it("flags a push-dominant programme", () => {
    const sets = [
      ...Array.from({ length: 10 }, () => set("bench", 60, 10)),
      ...Array.from({ length: 2 }, () => set("row", 50, 10)),
    ];
    const data: SessionWithSets[] = [{ session: session("2026-07-01T10:00:00"), sets }];
    const balance = balanceCheck(data, EXERCISES);
    expect(balance.pushSets).toBe(10);
    expect(balance.pullSets).toBe(2);
    expect(balance.imbalanced).toBe(true);
  });

  it("treats a balanced programme as fine", () => {
    const sets = [
      ...Array.from({ length: 6 }, () => set("bench", 60, 10)),
      ...Array.from({ length: 6 }, () => set("row", 50, 10)),
    ];
    const data: SessionWithSets[] = [{ session: session("2026-07-01T10:00:00"), sets }];
    expect(balanceCheck(data, EXERCISES).imbalanced).toBe(false);
  });
});

// ---- attendance ----------------------------------------------------------

describe("attendance", () => {
  it("returns one entry per day including rest days", () => {
    const today = new Date(2026, 6, 27);
    const data: SessionWithSets[] = [
      { session: session("2026-07-27T10:00:00"), sets: [set("bench", 60, 10)] },
    ];
    const heat = attendanceHeatmap(data, 7, today);
    expect(heat).toHaveLength(7);
    expect(heat[heat.length - 1]).toMatchObject({ date: "2026-07-27", sessions: 1 });
    expect(heat[0].sessions).toBe(0);
  });

  it("counts sessions in the current week", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [
      { session: session("2026-07-27T10:00:00"), sets: [] },
      { session: session("2026-07-29T10:00:00"), sets: [] },
      { session: session("2026-07-20T10:00:00"), sets: [] }, // previous week
    ];
    expect(sessionsThisWeek(data, today)).toBe(2);
  });
});

describe("consistencyScore", () => {
  it("is 100 when the weekly goal is met every week", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [];
    for (let w = 0; w < 8; w++) {
      const d = new Date(today);
      d.setDate(d.getDate() - w * 7);
      data.push({ session: session(d.toISOString()), sets: [] });
      const d2 = new Date(d);
      d2.setDate(d2.getDate() - 1);
      data.push({ session: session(d2.toISOString()), sets: [] });
    }
    expect(consistencyScore(data, 2, 8, today)).toBe(100);
  });

  it("is 0 with no training", () => {
    expect(consistencyScore([], 2, 8, new Date(2026, 6, 29))).toBe(0);
  });

  it("caps a single week's contribution at the goal", () => {
    // Five sessions in one week must not offset seven empty weeks.
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = Array.from({ length: 5 }, () => ({
      session: session("2026-07-29T10:00:00"),
      sets: [],
    }));
    expect(consistencyScore(data, 2, 8, today)).toBe(13); // 1/8 -> 12.5 -> 13
  });
});

describe("weekStreak", () => {
  it("counts consecutive weeks", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [
      { session: session("2026-07-29T10:00:00"), sets: [] },
      { session: session("2026-07-22T10:00:00"), sets: [] },
      { session: session("2026-07-15T10:00:00"), sets: [] },
    ];
    const streak = weekStreak(data, today);
    expect(streak.currentWeeks).toBe(3);
    expect(streak.longestWeeks).toBe(3);
  });

  it("does not break the streak during an untrained current week", () => {
    // Trained last week, nothing yet this week: the week isn't over.
    const today = new Date(2026, 7, 5);
    const data: SessionWithSets[] = [
      { session: session("2026-07-29T10:00:00"), sets: [] },
      { session: session("2026-07-22T10:00:00"), sets: [] },
    ];
    expect(weekStreak(data, today).currentWeeks).toBe(2);
  });

  it("resets after a missed week", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [
      { session: session("2026-07-29T10:00:00"), sets: [] },
      { session: session("2026-07-08T10:00:00"), sets: [] }, // gap
    ];
    expect(weekStreak(data, today).currentWeeks).toBe(1);
  });

  it("is zero without any sessions", () => {
    expect(weekStreak([], new Date())).toEqual({ currentWeeks: 0, longestWeeks: 0 });
  });
});

// ---- fun insights --------------------------------------------------------

describe("funnyUnitFor", () => {
  it("returns null for no volume", () => {
    expect(funnyUnitFor(0)).toBeNull();
  });

  it("picks a unit that reads as a small count", () => {
    const result = funnyUnitFor(10000);
    expect(result).not.toBeNull();
    expect(result!.count).toBeGreaterThanOrEqual(1);
    expect(result!.count).toBeLessThanOrEqual(100);
  });

  it("scales up to bigger units for huge totals", () => {
    const small = funnyUnitFor(200)!;
    const huge = funnyUnitFor(500000)!;
    expect(huge.unit.kg).toBeGreaterThan(small.unit.kg);
  });
});

describe("onThisDay", () => {
  it("compares today against roughly four weeks ago", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00"), sets: [set("bench", 40, 10)] },
      { session: session("2026-07-29T10:00:00"), sets: [set("bench", 50, 10)] },
    ];
    const result = onThisDay(data, "bench", 4, today);
    expect(result).toMatchObject({ thenWeight: 40, nowWeight: 50, percentChange: 25 });
  });

  it("returns null without enough history", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-29T10:00:00"), sets: [set("bench", 50, 10)] },
    ];
    expect(onThisDay(data, "bench", 4, new Date(2026, 6, 29))).toBeNull();
  });
});

describe("exerciseFrequency", () => {
  it("ranks by how many sessions included the exercise", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00"), sets: [set("bench", 60, 10), set("bench", 60, 8)] },
      { session: session("2026-07-08T10:00:00"), sets: [set("bench", 60, 10), set("row", 50, 10)] },
    ];
    const freq = exerciseFrequency(data);
    // bench appears in two sessions (counted once each), row in one.
    expect(freq[0]).toEqual({ exerciseId: "bench", sessions: 2 });
    expect(freq[1]).toEqual({ exerciseId: "row", sessions: 1 });
  });
});

describe("compareVolume", () => {
  it("computes the change against the previous week", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [
      { session: session("2026-07-29T10:00:00"), sets: [set("bench", 60, 10)] }, // 600 this week
      { session: session("2026-07-22T10:00:00"), sets: [set("bench", 50, 10)] }, // 500 last week
    ];
    expect(compareVolume(data, "week", today)).toEqual({
      current: 600,
      previous: 500,
      percentChange: 20,
    });
  });

  it("reports no change without a baseline", () => {
    const today = new Date(2026, 6, 29);
    const data: SessionWithSets[] = [
      { session: session("2026-07-29T10:00:00"), sets: [set("bench", 60, 10)] },
    ];
    expect(compareVolume(data, "week", today).percentChange).toBeNull();
  });
});

describe("bodyweightTrend", () => {
  it("includes only sessions that recorded a bodyweight", () => {
    const data: SessionWithSets[] = [
      { session: session("2026-07-01T10:00:00", { bodyweight: 82.5 }), sets: [] },
      { session: session("2026-07-08T10:00:00"), sets: [] },
    ];
    expect(bodyweightTrend(data)).toEqual([{ date: "2026-07-01", weight: 82.5 }]);
  });
});

describe("strengthLevel", () => {
  it("classifies relative to bodyweight", () => {
    expect(strengthLevel("pres", 40, 80)).toBe("begynder");
    expect(strengthLevel("pres", 70, 80)).toBe("oevet");
    expect(strengthLevel("pres", 110, 80)).toBe("avanceret");
  });

  it("returns null without a bodyweight", () => {
    expect(strengthLevel("pres", 70, 0)).toBeNull();
  });
});

describe("lifetimeTotals", () => {
  it("sums sets, reps, volume and PRs, ignoring warm-ups", () => {
    const data: SessionWithSets[] = [
      {
        session: session("2026-07-01T10:00:00"),
        sets: [
          set("bench", 20, 10, { isWarmup: true }),
          set("bench", 60, 10, { isPr: true }),
          set("bench", 60, 8),
        ],
      },
    ];
    const totals = lifetimeTotals(data);
    expect(totals).toMatchObject({ sessions: 1, sets: 2, reps: 18, volume: 1080, prs: 1 });
    expect(totals.minutes).toBe(45);
  });
});
