import { getDb, fromBool, newId, type Row } from "../sqlite";
import { mapExercise } from "../mappers";
import type { Exercise } from "@/lib/domain/types";

export function getExercise(id: string): Exercise | null {
  const row = getDb().prepare("SELECT * FROM exercises WHERE id = ?").get(id) as Row | undefined;
  return row ? mapExercise(row) : null;
}

export function getExerciseBySlug(slug: string): Exercise | null {
  const row = getDb().prepare("SELECT * FROM exercises WHERE slug = ?").get(slug) as
    | Row
    | undefined;
  return row ? mapExercise(row) : null;
}

export function listExercises(): Exercise[] {
  const rows = getDb().prepare("SELECT * FROM exercises ORDER BY name_da").all() as Row[];
  return rows.map(mapExercise);
}

export function getExercisesByIds(ids: string[]): Map<string, Exercise> {
  const map = new Map<string, Exercise>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`SELECT * FROM exercises WHERE id IN (${placeholders})`)
    .all(...ids) as Row[];
  for (const r of rows) {
    const ex = mapExercise(r);
    map.set(ex.id, ex);
  }
  return map;
}

export type ExerciseInput = Omit<Exercise, "id"> & { id?: string };

export function upsertExercise(input: ExerciseInput): Exercise {
  const id = input.id ?? newId();
  getDb()
    .prepare(
      `INSERT INTO exercises
        (id, slug, name_da, name_en, category, primary_muscles, equipment, unit,
         is_bodyweight, instructions_steps, instructions_steps_en, cues, cues_en,
         safer_variant, safer_variant_en, svg_key, image_url,
         difficulty, demo_video_url, created_by, is_public)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET
         name_da=excluded.name_da, name_en=excluded.name_en, category=excluded.category,
         primary_muscles=excluded.primary_muscles, equipment=excluded.equipment,
         unit=excluded.unit, is_bodyweight=excluded.is_bodyweight,
         instructions_steps=excluded.instructions_steps,
         instructions_steps_en=excluded.instructions_steps_en,
         cues=excluded.cues, cues_en=excluded.cues_en,
         safer_variant=excluded.safer_variant,
         safer_variant_en=excluded.safer_variant_en, svg_key=excluded.svg_key,
         image_url=excluded.image_url,
         difficulty=excluded.difficulty, demo_video_url=excluded.demo_video_url,
         is_public=excluded.is_public`,
    )
    .run(
      id,
      input.slug,
      input.nameDa,
      input.nameEn,
      input.category,
      JSON.stringify(input.primaryMuscles),
      input.equipment,
      input.unit,
      fromBool(input.isBodyweight),
      JSON.stringify(input.instructionsSteps),
      JSON.stringify(input.instructionsStepsEn),
      JSON.stringify(input.cues),
      JSON.stringify(input.cuesEn),
      input.saferVariant,
      input.saferVariantEn,
      input.svgKey,
      input.imageUrl,
      input.difficulty,
      input.demoVideoUrl,
      input.createdBy,
      fromBool(input.isPublic),
    );
  return getExerciseBySlug(input.slug)!;
}
