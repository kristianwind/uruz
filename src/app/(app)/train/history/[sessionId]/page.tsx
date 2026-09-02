import Link from "next/link";
import { redirect } from "next/navigation";
import { localizedTitle } from "@/lib/i18n/metadata";
import { PageHeader } from "@/components/app/PageHeader";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { SessionEditor } from "@/components/train/SessionEditor";
import { SaveAsWorkoutButton } from "@/components/train/SaveAsWorkoutButton";
import { requireContext } from "@/lib/auth/session";
import { getSession, listSessionSets } from "@/lib/db/repo/sessions";
import { getWorkout } from "@/lib/db/repo/workouts";
import { getExercisesByIds } from "@/lib/db/repo/exercises";
import { getT } from "@/lib/i18n/server";
import { workoutName, exerciseName } from "@/lib/domain/localize";
import { saveSessionAsWorkoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("train.history");

/**
 * One finished workout, as it was logged — and correctable.
 *
 * Reuses the same set rows as the live logging screen, so a set is edited the
 * same way whether it was logged a minute ago or last month.
 */
export default async function HistorySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const session = getSession(sessionId);
  if (!session || session.userId !== ctx.user.id) redirect("/train/history");

  const sets = listSessionSets(session.id);
  const exercises = getExercisesByIds(sets.map((s) => s.exerciseId));
  const workout = session.workoutId ? getWorkout(session.workoutId) : null;

  // Grouped by exercise, in the order they were first logged — which is the
  // order they were actually done in.
  const order: string[] = [];
  for (const s of sets) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);

  const groups = order.map((exerciseId) => {
    const ex = exercises.get(exerciseId);
    return {
      exerciseId,
      name: ex ? exerciseName(ex, t.locale) : exerciseId,
      isTimed: ex?.unit === "sek",
      sets: sets.filter((s) => s.exerciseId === exerciseId),
    };
  });

  return (
    <div className="lg:max-w-3xl">
      <Link href="/train/history" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("train.history")}
      </Link>
      <PageHeader
        title={workout ? workoutName(workout, t.locale) : t("train.freeWorkout")}
        subtitle={new Date(session.startedAt).toLocaleDateString(
          t.locale === "da" ? "da-DK" : "en-GB",
          { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        )}
      />

      {/* Do it again. A training in the archive was a record and nothing else:
          the workout behind it was two screens away, and a free session had no
          workout behind it at all. */}
      <div className="mb-5">
        {workout ? (
          <Link href={`/library/workout/${workout.id}?from=history`}>
            <Button variant="secondary" fullWidth>
              {t("train.trainAgain")}
            </Button>
          </Link>
        ) : (
          <SaveAsWorkoutButton sessionId={session.id} action={saveSessionAsWorkoutAction} />
        )}
      </div>

      <SessionEditor sessionId={session.id} groups={groups} />
    </div>
  );
}
