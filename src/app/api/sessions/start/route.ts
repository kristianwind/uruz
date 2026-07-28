import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { startSession, getActiveSession } from "@/lib/db/repo/sessions";
import { getWorkout } from "@/lib/db/repo/workouts";

export const runtime = "nodejs";

const Body = z.object({
  workoutId: z.string().min(1).nullable().optional(),
  /** Client-generated session id so an offline start stays idempotent. */
  id: z.string().min(1).optional(),
});

/** Begin a training session (from a template, or free training). */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const workoutId = parsed.data.workoutId ?? null;
  if (workoutId) {
    const workout = getWorkout(workoutId);
    if (!workout || workout.hallId !== ctx.hall.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  // Reuse an already-open session rather than stacking duplicates.
  const active = getActiveSession(ctx.user.id);
  if (active) return NextResponse.json({ ok: true, session: active, resumed: true });

  const session = startSession(ctx.user.id, workoutId, parsed.data.id);
  return NextResponse.json({ ok: true, session, resumed: false });
}
