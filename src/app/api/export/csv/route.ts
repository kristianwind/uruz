import { getContext } from "@/lib/auth/session";
import { listCompletedSessions, listSessionSets } from "@/lib/db/repo/sessions";
import { listExercises } from "@/lib/db/repo/exercises";
import { getWorkout } from "@/lib/db/repo/workouts";

export const runtime = "nodejs";

/** Escape a value for CSV (quotes doubled, field wrapped when needed). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Export the signed-in user's own training log as CSV — one row per set
 * (spec §13/§10: the user can take their data with them).
 *
 * Uses semicolons, which is what Danish Excel expects for CSV.
 */
export async function GET() {
  const ctx = await getContext();
  if (!ctx) return new Response("unauthenticated", { status: 401 });

  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const rows: string[] = [];
  rows.push(
    [
      "dato",
      "traening",
      "oevelse",
      "saet",
      "vaegt_kg",
      "reps",
      "sekunder",
      "opvarmning",
      "rekord",
      "rir",
      "humoer",
      "rpe",
      "kropsvaegt",
      "note",
    ].join(";"),
  );

  for (const session of listCompletedSessions(ctx.user.id)) {
    const workout = session.workoutId ? getWorkout(session.workoutId) : null;
    for (const set of listSessionSets(session.id)) {
      const ex = exercises.get(set.exerciseId);
      rows.push(
        [
          session.startedAt,
          workout?.name ?? "",
          ex?.nameDa ?? set.exerciseId,
          set.setIndex + 1,
          set.weight ?? "",
          set.reps ?? "",
          set.seconds ?? "",
          set.isWarmup ? "ja" : "nej",
          set.isPr ? "ja" : "nej",
          set.rir ?? "",
          session.mood ?? "",
          session.rpe ?? "",
          session.bodyweight ?? "",
          session.note ?? "",
        ]
          .map(csvCell)
          .join(";"),
      );
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  // BOM so Excel detects UTF-8 and renders æ/ø/å correctly.
  return new Response("﻿" + rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="uruz-${date}.csv"`,
    },
  });
}
