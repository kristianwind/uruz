import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { WorkoutBuilder, type BuilderWorkout } from "@/components/library/WorkoutBuilder";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { getWorkout, getWorkoutExercises } from "@/lib/db/repo/workouts";
import { listExercises } from "@/lib/db/repo/exercises";
import { localizeExercise, workoutName } from "@/lib/domain/localize";
import { getT } from "@/lib/i18n/server";
import { saveWorkoutAction } from "../../actions";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("titles.builderTitle");

/**
 * Program builder route. `new` starts an empty workout; any other id edits an
 * existing one belonging to the hall.
 */
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const isNew = workoutId === "new";

  let initial: BuilderWorkout;
  if (isNew) {
    initial = {
      id: null,
      name: "",
      description: null,
      goal: "helkrop",
      level: ctx.user.difficulty,
      estimatedMinutes: 45,
      items: [],
    };
  } else {
    const workout = getWorkout(workoutId);
    if (!workout || workout.hallId !== ctx.hall.id) notFound();
    // Templates are shared content: only an admin edits them in place. Everyone
    // else reaches the builder through "duplicate & adjust".
    if (workout.isTemplate && ctx.user.role !== "admin") notFound();

    initial = {
      id: workout.id,
      name: workoutName(workout, t.locale),
      description: workout.description,
      goal: workout.goal,
      level: workout.level,
      estimatedMinutes: workout.estimatedMinutes,
      items: getWorkoutExercises(workout.id).map((it) => ({
        exerciseId: it.exerciseId,
        targetSets: it.targetSets,
        targetRepsMin: it.targetRepsMin,
        targetRepsMax: it.targetRepsMax,
        targetSeconds: it.targetSeconds,
        restSeconds: it.restSeconds,
        progressionMode: it.progressionMode,
        isWarmup: it.isWarmup,
      })),
    };
  }

  const library = listExercises()
    .map((e) => localizeExercise(e, t.locale))
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      equipment: e.equipment,
      unit: e.unit,
      primaryMuscles: e.primaryMuscles,
      svgKey: e.svgKey,
      imageUrl: e.imageUrl,
    }));

  return (
    <div>
      <Link href="/library" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("library.title")}
      </Link>
      <PageHeader title={isNew ? t("library.newWorkout") : t("common.edit")} />
      <WorkoutBuilder
        initial={initial}
        library={library}
        mediaPref={ctx.user.mediaPref}
        onSave={saveWorkoutAction}
      />
    </div>
  );
}
