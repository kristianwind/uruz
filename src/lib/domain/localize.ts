import type { Exercise } from "./types";
import type { Locale } from "@/lib/i18n/core";

/**
 * Exercise content is authored in Danish and optionally translated. This picks
 * the right fields for a locale and always falls back to Danish, so a partially
 * translated library never shows blanks.
 */
export interface LocalizedExercise {
  id: string;
  slug: string;
  name: string;
  steps: string[];
  cues: string[];
  saferVariant: string | null;
  svgKey: string | null;
  imageUrl: string | null;
  category: Exercise["category"];
  equipment: Exercise["equipment"];
  difficulty: Exercise["difficulty"];
  unit: Exercise["unit"];
  isBodyweight: boolean;
  primaryMuscles: string[];
}

export function localizeExercise(ex: Exercise, locale: Locale): LocalizedExercise {
  const en = locale === "en";
  return {
    id: ex.id,
    slug: ex.slug,
    name: (en && ex.nameEn) || ex.nameDa,
    steps: en && ex.instructionsStepsEn.length ? ex.instructionsStepsEn : ex.instructionsSteps,
    cues: en && ex.cuesEn.length ? ex.cuesEn : ex.cues,
    saferVariant: (en && ex.saferVariantEn) || ex.saferVariant,
    svgKey: ex.svgKey,
    imageUrl: ex.imageUrl,
    category: ex.category,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    unit: ex.unit,
    isBodyweight: ex.isBodyweight,
    primaryMuscles: ex.primaryMuscles,
  };
}

/** Convenience for the common "just the display name" case. */
export function exerciseName(ex: Exercise, locale: Locale): string {
  return (locale === "en" && ex.nameEn) || ex.nameDa;
}

/**
 * Seeded workout templates ship with an English name; workouts a user created
 * themselves keep whatever they typed, in any language.
 */
export function workoutName(
  w: { name: string; nameEn: string | null },
  locale: Locale,
): string {
  return (locale === "en" && w.nameEn) || w.name;
}

export function workoutDescription(
  w: { description: string | null; descriptionEn: string | null },
  locale: Locale,
): string | null {
  return (locale === "en" && w.descriptionEn) || w.description;
}
