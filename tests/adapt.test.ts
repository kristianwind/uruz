import { describe, it, expect } from "vitest";
import {
  mentionsPain,
  suggestAlternatives,
  applyProposal,
  describeConstraints,
} from "@/lib/coach/adapt";
import type { Exercise, ProgressionMode } from "@/lib/domain/types";
import type { UserConstraint } from "@/lib/db/repo/constraints";

function ex(
  id: string,
  category: Exercise["category"],
  muscles: string[],
  equipment: Exercise["equipment"] = "maskine",
  difficulty: Exercise["difficulty"] = "begynder",
): Exercise {
  return {
    id,
    slug: id,
    nameDa: id,
    nameEn: id,
    category,
    primaryMuscles: muscles,
    equipment,
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
    difficulty,
    demoVideoUrl: null,
    createdBy: null,
    isPublic: true,
  };
}

function item(exerciseId: string, order = 0) {
  return {
    exerciseId,
    order,
    targetSets: 3,
    targetRepsMin: 10 as number | null,
    targetRepsMax: 12 as number | null,
    targetSeconds: null as number | null,
    restSeconds: 90,
    progressionMode: "double" as ProgressionMode,
  };
}

describe("mentionsPain", () => {
  it("detects Danish pain words", () => {
    expect(mentionsPain("Min skulder gør ondt")).toBe(true);
    expect(mentionsPain("Jeg har smerter i lænden")).toBe(true);
    expect(mentionsPain("Knæet er ømt")).toBe(true);
  });

  it("detects English pain words", () => {
    expect(mentionsPain("my shoulder hurts")).toBe(true);
    expect(mentionsPain("lower back is sore")).toBe(true);
  });

  it("does not fire on an ordinary wish", () => {
    expect(mentionsPain("Jeg vil gerne træne mere ryg")).toBe(false);
    expect(mentionsPain("Jeg har kun 20 minutter")).toBe(false);
  });
});

describe("suggestAlternatives", () => {
  const library = [
    ex("bench-machine", "pres", ["bryst", "triceps"], "maskine"),
    ex("bench-db", "pres", ["bryst", "triceps"], "haandvaegt", "erfaren"),
    ex("row", "traek", ["ryg", "biceps"], "kabel"),
    ex("squat", "ben", ["forlaar"], "haandvaegt"),
  ];

  it("prefers an exercise hitting the same muscles", () => {
    const target = ex("overhead", "pres", ["bryst", "triceps"], "stang");
    const alts = suggestAlternatives(target, library, 2);
    expect(alts.map((a) => a.id)).toContain("bench-machine");
  });

  it("prefers machines over free weights for the same muscles", () => {
    const target = ex("overhead", "pres", ["bryst", "triceps"], "stang");
    const alts = suggestAlternatives(target, library, 3);
    expect(alts[0].equipment).toBe("maskine");
  });

  it("never suggests the exercise itself", () => {
    const target = library[0];
    expect(suggestAlternatives(target, library).map((a) => a.id)).not.toContain(target.id);
  });

  it("returns nothing when no exercise overlaps", () => {
    const target = ex("cardio", "kondi", ["kondi"], "maskine");
    expect(suggestAlternatives(target, [ex("row", "traek", ["ryg"])])).toEqual([]);
  });
});

describe("applyProposal", () => {
  const items = [item("a", 0), item("b", 1), item("c", 2)];

  it("swaps an exercise while keeping its targets", () => {
    const next = applyProposal(items, {
      swaps: [{ fromExerciseId: "b", fromName: "B", toExerciseId: "z", toName: "Z", reason: "" }],
      adjustments: [],
      removals: [],
    });
    expect(next.map((i) => i.exerciseId)).toEqual(["a", "z", "c"]);
    expect(next[1].targetSets).toBe(3);
  });

  it("applies adjustments to the named exercise only", () => {
    const next = applyProposal(items, {
      swaps: [],
      adjustments: [{ exerciseId: "a", name: "A", targetSets: 2, restSeconds: 120, reason: "" }],
      removals: [],
    });
    expect(next[0]).toMatchObject({ exerciseId: "a", targetSets: 2, restSeconds: 120 });
    expect(next[1].targetSets).toBe(3);
  });

  it("removes an exercise and renumbers the order", () => {
    const next = applyProposal(items, {
      swaps: [],
      adjustments: [],
      removals: [{ exerciseId: "b", name: "B", reason: "" }],
    });
    expect(next.map((i) => i.exerciseId)).toEqual(["a", "c"]);
    expect(next.map((i) => i.order)).toEqual([0, 1]);
  });

  it("lets a swap win when the same exercise is also marked for removal", () => {
    // Models often express "replace X" as both a swap and a removal of X.
    // Taken literally the exercise would vanish; the replacement must survive.
    const next = applyProposal(items, {
      swaps: [{ fromExerciseId: "b", fromName: "B", toExerciseId: "z", toName: "Z", reason: "" }],
      adjustments: [],
      removals: [{ exerciseId: "b", name: "B", reason: "" }],
    });
    expect(next.map((i) => i.exerciseId)).toEqual(["a", "z", "c"]);
  });

  it("leaves the workout untouched for an empty proposal", () => {
    const next = applyProposal(items, { swaps: [], adjustments: [], removals: [] });
    expect(next.map((i) => i.exerciseId)).toEqual(["a", "b", "c"]);
  });
});

describe("describeConstraints", () => {
  const constraint = (kind: UserConstraint["kind"], body: string): UserConstraint => ({
    id: body,
    userId: "u1",
    kind,
    body,
    data: null,
    isActive: true,
    createdAt: "2026-07-28T10:00:00.000Z",
    resolvedAt: null,
  });

  it("says so plainly when there is nothing recorded", () => {
    expect(describeConstraints([])).toContain("Ingen kendte");
  });

  it("labels ailments and wishes distinctly", () => {
    const text = describeConstraints([
      constraint("skavank", "dårlig skulder"),
      constraint("oenske", "mere ryg"),
    ]);
    expect(text).toContain("Skavank: dårlig skulder");
    expect(text).toContain("Ønske: mere ryg");
  });
});
