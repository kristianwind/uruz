import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { adaptWorkout } from "@/lib/coach/adapt";
import { getWorkout } from "@/lib/db/repo/workouts";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  workoutId: z.string().min(1),
  request: z.string().trim().min(1).max(500),
  remember: z.boolean().optional(),
});

/**
 * Ask Kvasir to adapt a workout to an ailment or a wish. Returns a proposal —
 * nothing is changed until the user applies it.
 */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const workout = getWorkout(parsed.data.workoutId);
  if (!workout || workout.hallId !== ctx.hall.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const proposal = await adaptWorkout({
    userId: ctx.user.id,
    workoutId: parsed.data.workoutId,
    request: parsed.data.request,
    remember: parsed.data.remember,
  });
  if (!proposal) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  return NextResponse.json(proposal);
}
