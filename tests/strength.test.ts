import { describe, it, expect } from "vitest";
import {
  estimate1RM,
  setVolume,
  totalVolume,
  roundToLoadable,
  prCandidatesForSet,
  newRecords,
  doubleProgression,
  linearProgression,
  rirProgression,
  suggestProgression,
} from "@/lib/domain/strength";

describe("estimate1RM", () => {
  it("returns the weight itself for a single", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("scales up with reps (Epley)", () => {
    // 60 kg × 10 -> 60 * (1 + 10/30) = 80
    expect(estimate1RM(60, 10)).toBeCloseTo(80, 6);
  });

  it("is zero for non-positive input", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(50, 0)).toBe(0);
  });
});

describe("volume", () => {
  it("multiplies weight by reps", () => {
    expect(setVolume({ weight: 50, reps: 10 })).toBe(500);
  });

  it("is zero for timed / bodyweight sets", () => {
    expect(setVolume({ weight: null, reps: null })).toBe(0);
  });

  it("excludes warm-ups from the total", () => {
    const sets = [
      { weight: 20, reps: 10, isWarmup: true },
      { weight: 50, reps: 10, isWarmup: false },
      { weight: 50, reps: 8, isWarmup: false },
    ];
    expect(totalVolume(sets)).toBe(500 + 400);
  });
});

describe("roundToLoadable", () => {
  it("uses 2.5 kg steps at gym weights", () => {
    expect(roundToLoadable(61.2)).toBe(60);
    expect(roundToLoadable(61.5)).toBe(62.5);
  });

  it("uses 1 kg steps for light loads", () => {
    expect(roundToLoadable(12.4)).toBe(12);
  });

  it("never returns negative", () => {
    expect(roundToLoadable(-5)).toBe(0);
  });
});

describe("PR detection", () => {
  it("produces weight, reps, 1RM and volume candidates for a working set", () => {
    const types = prCandidatesForSet({
      weight: 60,
      reps: 10,
      seconds: null,
      isWarmup: false,
    }).map((c) => c.type);
    expect(types).toEqual(["max_weight", "max_reps", "1rm_est", "max_volume"]);
  });

  it("produces a hold record for timed sets", () => {
    const c = prCandidatesForSet({ weight: null, reps: null, seconds: 45, isWarmup: false });
    expect(c).toEqual([{ type: "max_hold", value: 45 }]);
  });

  it("ignores warm-up sets entirely", () => {
    expect(
      prCandidatesForSet({ weight: 100, reps: 10, seconds: null, isWarmup: true }),
    ).toEqual([]);
  });

  it("only counts strictly better values as records", () => {
    const candidates = prCandidatesForSet({
      weight: 60,
      reps: 10,
      seconds: null,
      isWarmup: false,
    });
    // Equalling the previous best is not a new record.
    const repeats = newRecords(candidates, {
      max_weight: 60,
      max_reps: 10,
      "1rm_est": 80,
      max_volume: 600,
    });
    expect(repeats).toEqual([]);

    // Beating one of them yields exactly that record.
    const better = newRecords(candidates, {
      max_weight: 55,
      max_reps: 10,
      "1rm_est": 80,
      max_volume: 600,
    });
    expect(better.map((r) => r.type)).toEqual(["max_weight"]);
  });

  it("treats a missing best as a record", () => {
    const candidates = prCandidatesForSet({
      weight: 40,
      reps: 8,
      seconds: null,
      isWarmup: false,
    });
    expect(newRecords(candidates, {}).length).toBe(4);
  });
});

describe("double progression", () => {
  const base = { targetSets: 3, targetRepsMin: 10, targetRepsMax: 12 };

  it("adds weight once every set reaches the top of the range", () => {
    const s = doubleProgression({ ...base, lastWeight: 60, lastReps: [12, 12, 12] });
    expect(s.reason).toBe("increase");
    expect(s.weight).toBe(62.5);
    expect(s.reps).toBe(10); // back to the bottom of the range
  });

  it("holds the weight and chases a rep when not all sets are at the top", () => {
    const s = doubleProgression({ ...base, lastWeight: 60, lastReps: [12, 11, 10] });
    expect(s.reason).toBe("add_reps");
    expect(s.weight).toBe(60);
    expect(s.reps).toBe(12);
  });

  it("never suggests more than the top of the rep range", () => {
    const s = doubleProgression({ ...base, lastWeight: 60, lastReps: [12, 12, 11] });
    expect(s.reps).toBeLessThanOrEqual(base.targetRepsMax);
  });

  it("deloads when the first set falls well short", () => {
    const s = doubleProgression({ ...base, lastWeight: 60, lastReps: [7, 6, 5] });
    expect(s.reason).toBe("deload");
    expect(s.weight).toBeLessThan(60);
  });

  it("holds when there is no history yet", () => {
    expect(doubleProgression({ ...base, lastWeight: 0, lastReps: [] }).reason).toBe("hold");
  });

  it("requires a full set count before increasing", () => {
    // Only two sets logged of three: not yet a completed top-of-range session.
    const s = doubleProgression({ ...base, lastWeight: 60, lastReps: [12, 12] });
    expect(s.reason).not.toBe("increase");
  });

  it("moves light loads by 1 kg steps", () => {
    const s = doubleProgression({ ...base, lastWeight: 10, lastReps: [12, 12, 12] });
    expect(s.weight).toBe(11);
  });
});

describe("linear progression", () => {
  const base = { targetSets: 3, targetRepsMin: 10, targetRepsMax: 12 };

  it("increases when every set met the minimum", () => {
    const s = linearProgression({ ...base, lastWeight: 60, lastReps: [10, 10, 10] });
    expect(s.weight).toBe(62.5);
    expect(s.reason).toBe("increase");
  });

  it("holds when a set missed the minimum", () => {
    const s = linearProgression({ ...base, lastWeight: 60, lastReps: [10, 10, 9] });
    expect(s.reason).toBe("hold");
    expect(s.weight).toBe(60);
  });
});

describe("RIR progression", () => {
  const base = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 };

  it("adds weight when several reps were left in reserve", () => {
    const s = rirProgression({ ...base, lastWeight: 60, lastReps: [12, 12, 12], lastRir: 3 });
    expect(s.reason).toBe("increase");
    expect(s.weight).toBeGreaterThan(60);
  });

  it("backs off when the set was maximal", () => {
    const s = rirProgression({ ...base, lastWeight: 60, lastReps: [8, 8, 8], lastRir: 0 });
    expect(s.reason).toBe("deload");
    expect(s.weight).toBeLessThan(60);
  });

  it("falls back to double progression without RIR data", () => {
    const s = rirProgression({ ...base, lastWeight: 60, lastReps: [12, 12, 12], lastRir: null });
    expect(s.reason).toBe("increase");
  });
});

describe("suggestProgression dispatch", () => {
  const input = { lastWeight: 60, lastReps: [12, 12, 12], targetSets: 3, targetRepsMin: 10, targetRepsMax: 12 };

  it("returns null when progression is disabled", () => {
    expect(suggestProgression("none", input)).toBeNull();
  });

  it("routes to the selected engine", () => {
    expect(suggestProgression("double", input)?.weight).toBe(62.5);
    expect(suggestProgression("linear", input)?.weight).toBe(62.5);
  });
});
