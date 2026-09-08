import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SEED_EXERCISES, SEED_TEMPLATES } from "@/lib/db/seed-data";
import { hasIllustration } from "@/components/exercise/Illustration";
import da from "@locales/da.json";
import en from "@locales/en.json";

/**
 * The seeded library is data, and data has no compiler.
 *
 * A new machine is a record with a drawing key, muscle keys and two languages
 * of text — each one a string nobody checks until a member opens the exercise
 * and finds a raw key, a generic figure, or a template pointing at nothing.
 * This is that check, run before the image is built.
 */

const CATEGORIES = ["ben", "pres", "traek", "kerne", "kondi"];
const EQUIPMENT = ["maskine", "haandvaegt", "kabel", "kropsvaegt", "stang"];
const UNITS = ["kg", "sek", "reps", "km"];

describe("the seeded exercise library", () => {
  it("has one slug per exercise, and one exercise per slug", () => {
    const slugs = SEED_EXERCISES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("has a drawing for every exercise, not the generic fallback", () => {
    for (const e of SEED_EXERCISES) {
      expect(hasIllustration(e.svgKey), `${e.slug} → svgKey "${e.svgKey}"`).toBe(true);
    }
  });

  it("names muscles both languages can label", () => {
    const daMuscles = da.muscles as Record<string, string>;
    const enMuscles = en.muscles as Record<string, string>;
    for (const e of SEED_EXERCISES) {
      for (const m of e.primaryMuscles) {
        expect(daMuscles[m], `${e.slug}: da muscles.${m}`).toBeTruthy();
        expect(enMuscles[m], `${e.slug}: en muscles.${m}`).toBeTruthy();
      }
    }
  });

  it("stays inside the category, equipment and unit vocabularies", () => {
    for (const e of SEED_EXERCISES) {
      expect(CATEGORIES, e.slug).toContain(e.category);
      expect(EQUIPMENT, e.slug).toContain(e.equipment);
      expect(UNITS, e.slug).toContain(e.unit);
    }
  });

  it("says everything in both languages", () => {
    for (const e of SEED_EXERCISES) {
      expect(e.nameDa, e.slug).toBeTruthy();
      expect(e.nameEn, e.slug).toBeTruthy();
      expect(e.instructionsStepsEn, e.slug).toHaveLength(e.instructionsSteps.length);
      expect(e.cuesEn, e.slug).toHaveLength(e.cues.length);
      expect(!!e.saferVariantEn, e.slug).toBe(!!e.saferVariant);
    }
  });

  it("is what the templates are built from", () => {
    const slugs = new Set(SEED_EXERCISES.map((e) => e.slug));
    for (const tpl of SEED_TEMPLATES) {
      for (const te of tpl.exercises) expect(slugs, `${tpl.name}: ${te.slug}`).toContain(te.slug);
    }
  });

  it("is the size the README says it is", () => {
    const n = SEED_EXERCISES.length;
    expect(readFileSync("README.md", "utf8")).toContain(`${n} exercises`);
    expect(readFileSync("README.da.md", "utf8")).toContain(`${n} øvelser`);
  });
});
