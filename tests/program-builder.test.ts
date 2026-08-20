import { describe, it, expect } from "vitest";
import { planFromRules, workoutCountFor } from "@/lib/coach/program-builder";
import type { Exercise } from "@/lib/domain/types";

/**
 * The floor, not a degraded mode.
 *
 * With no model configured at all, asking Kvasir for a program must still give
 * back something you could walk into a gym and train. Everything the model adds
 * is polish on top of this.
 */

const ex = (
  slug: string,
  category: Exercise["category"],
  equipment: Exercise["equipment"] = "maskine",
): Exercise =>
  ({
    id: `id-${slug}`,
    slug,
    nameDa: slug,
    nameEn: slug,
    category,
    equipment,
    unit: "kg",
    isBodyweight: false,
    primaryMuscles: [],
  }) as unknown as Exercise;

const library: Exercise[] = [
  ex("benpres", "ben"),
  ex("goblet", "ben", "haandvaegt"),
  ex("brystpres", "pres"),
  ex("skulderpres", "pres"),
  ex("nedtraek", "traek"),
  ex("roning", "traek", "kabel"),
  ex("planke", "kerne", "kropsvaegt"),
  ex("romaskine", "kondi"),
];

const wish = { goal: "Styrke", daysPerWeek: 3, minutes: 45, equipment: [] as string[] };

describe("workoutCountFor", () => {
  it("keeps a rotation between two and four", () => {
    expect(workoutCountFor(1)).toBe(2);
    expect(workoutCountFor(2)).toBe(2);
    expect(workoutCountFor(3)).toBe(3);
    expect(workoutCountFor(6)).toBe(4);
  });
});

describe("planFromRules", () => {
  it("makes a rotation of the right size", () => {
    expect(planFromRules(library, wish)).toHaveLength(3);
  });

  it("opens every day with cardio, marked as warm-up", () => {
    for (const day of planFromRules(library, wish)) {
      expect(day.exercises[0].exercise.category).toBe("kondi");
      expect(day.exercises[0].warmup).toBe(true);
    }
  });

  it("never repeats an exercise inside a day", () => {
    for (const day of planFromRules(library, wish)) {
      const ids = day.exercises.map((e) => e.exercise.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("spreads the work instead of piling on one pattern", () => {
    const day = planFromRules(library, wish)[0];
    const categories = new Set(
      day.exercises.filter((e) => !e.warmup).map((e) => e.exercise.category),
    );
    expect(categories.size).toBeGreaterThan(1);
  });

  it("gives a short day fewer exercises than a long one", () => {
    const short = planFromRules(library, { ...wish, minutes: 20 })[0].exercises.length;
    const long = planFromRules(library, { ...wish, minutes: 60 })[0].exercises.length;
    expect(short).toBeLessThan(long);
  });

  it("respects the equipment you actually have", () => {
    const plan = planFromRules(library, { ...wish, equipment: ["kropsvaegt"] });
    for (const day of plan) {
      for (const e of day.exercises) expect(e.exercise.equipment).toBe("kropsvaegt");
    }
  });

  it("would rather use the whole library than hand back nothing", () => {
    // Nobody has this equipment; a plan is still better than an empty screen.
    const plan = planFromRules(library, { ...wish, equipment: ["findes-ikke"] });
    expect(plan[0].exercises.length).toBeGreaterThan(0);
  });

  it("copes with a library too thin to fill a day", () => {
    const plan = planFromRules([ex("benpres", "ben")], wish);
    expect(plan).toHaveLength(3);
    expect(plan[0].exercises.length).toBeGreaterThan(0);
  });
});
