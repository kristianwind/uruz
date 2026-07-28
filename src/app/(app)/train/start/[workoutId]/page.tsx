import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/session";
import { getWorkout } from "@/lib/db/repo/workouts";
import { getActiveSession, startSession } from "@/lib/db/repo/sessions";

export const dynamic = "force-dynamic";

/**
 * Starting a workout is a side effect, not a screen: create (or resume) the
 * session and send the user straight to the logging view.
 */
export default async function StartWorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const ctx = await requireContext();

  const workout = getWorkout(workoutId);
  if (!workout || workout.hallId !== ctx.hall.id) redirect("/train");

  const existing = getActiveSession(ctx.user.id);
  const session = existing ?? startSession(ctx.user.id, workoutId);
  redirect(`/train/session/${session.id}`);
}
