import { describe, it, expect } from "vitest";
import { nextWorkout, wholeDaysBetween, weeklyAdherence } from "@/lib/domain/program";
import type { ProgramSlot } from "@/lib/domain/program";

/**
 * "What should I do today?" — the question the Train page could not answer.
 */

const now = new Date("2026-08-20T18:00:00.000Z");
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();

const slot = (workoutId: string, order: number, lastTrainedAt: string | null): ProgramSlot => ({
  workoutId,
  order,
  lastTrainedAt,
});

describe("nextWorkout", () => {
  it("has nothing to say about an empty plan", () => {
    expect(nextWorkout([], now)).toBeNull();
  });

  it("starts at the top when nothing has been trained", () => {
    const out = nextWorkout([slot("b", 1, null), slot("a", 0, null)], now);
    expect(out).toEqual({ workoutId: "a", daysSince: null, reason: "never" });
  });

  it("finishes the first round before repeating", () => {
    // A trained yesterday, B never — B is next even though A is first in order.
    const out = nextWorkout([slot("a", 0, daysAgo(1)), slot("b", 1, null)], now);
    expect(out?.workoutId).toBe("b");
    expect(out?.reason).toBe("never");
  });

  it("picks the one that has waited longest", () => {
    const out = nextWorkout(
      [slot("a", 0, daysAgo(2)), slot("b", 1, daysAgo(5)), slot("c", 2, daysAgo(1))],
      now,
    );
    expect(out?.workoutId).toBe("b");
    expect(out?.daysSince).toBe(5);
    expect(out?.reason).toBe("longest");
  });

  it("alternates an A/B split the way a person would", () => {
    // Did A today; B is due next.
    expect(nextWorkout([slot("a", 0, daysAgo(0)), slot("b", 1, daysAgo(1))], now)?.workoutId).toBe("b");
    // Then B today; A is due again.
    expect(nextWorkout([slot("a", 0, daysAgo(1)), slot("b", 1, daysAgo(0))], now)?.workoutId).toBe("a");
  });

  it("breaks a tie on the running order, not on chance", () => {
    const same = daysAgo(3);
    const out = nextWorkout([slot("b", 1, same), slot("a", 0, same)], now);
    expect(out?.workoutId).toBe("a");
  });
});

describe("wholeDaysBetween", () => {
  it("counts calendar days, not elapsed hours", () => {
    // Built in local time on purpose: "days since" is what the calendar on the
    // wall says, so the answer must not change with the machine's timezone.
    // 22:00 last night to 18:00 this evening is 20 hours — and one day.
    const lateYesterday = new Date(2026, 7, 19, 22, 0, 0);
    const thisEvening = new Date(2026, 7, 20, 18, 0, 0);
    expect(wholeDaysBetween(lateYesterday.toISOString(), thisEvening)).toBe(1);
  });

  it("is zero for earlier today, and never negative", () => {
    expect(wholeDaysBetween("2026-08-20T06:00:00.000Z", now)).toBe(0);
    expect(wholeDaysBetween("2026-08-25T06:00:00.000Z", now)).toBe(0);
  });

  it("shrugs at garbage rather than throwing mid-workout", () => {
    expect(wholeDaysBetween("ikke en dato", now)).toBe(0);
  });
});

describe("weeklyAdherence", () => {
  it("caps at one, so extra sessions are never a deficit", () => {
    expect(weeklyAdherence(5, 3)).toBe(1);
    expect(weeklyAdherence(0, 3)).toBe(0);
    expect(weeklyAdherence(3, 4)).toBeCloseTo(0.75);
  });

  it("treats a plan with no days as met", () => {
    expect(weeklyAdherence(0, 0)).toBe(1);
  });
});
