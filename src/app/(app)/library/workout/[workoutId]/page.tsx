import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardMuted } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BodyMap, muscleIntensity } from "@/components/exercise/BodyMap";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { ChevronLeftIcon, ClockIcon } from "@/components/ui/icons";
import { DuplicateButton } from "@/components/library/DuplicateButton";
import { AdaptWorkout } from "@/components/coach/AdaptWorkout";
import { requireContext } from "@/lib/auth/session";
import { getWorkout, getWorkoutExercises } from "@/lib/db/repo/workouts";
import { getExercisesByIds } from "@/lib/db/repo/exercises";
import { localizeExercise, workoutName, workoutDescription } from "@/lib/domain/localize";
import { getT } from "@/lib/i18n/server";
import { duplicateWorkoutAction, applyAdaptationAction } from "../../actions";

export const dynamic = "force-dynamic";

/** Workout detail: what's in it, which muscles it hits, and how to start it. */
export default async function WorkoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workoutId: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { workoutId } = await params;
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const workout = getWorkout(workoutId);
  if (!workout || workout.hallId !== ctx.hall.id) notFound();

  const items = getWorkoutExercises(workout.id);
  const exercises = getExercisesByIds(items.map((i) => i.exerciseId));
  const localized = items.flatMap((item) => {
    const ex = exercises.get(item.exerciseId);
    return ex ? [{ item, ex: localizeExercise(ex, t.locale) }] : [];
  });

  const intensity = muscleIntensity(localized.map(({ ex }) => ex.primaryMuscles));
  const description = workoutDescription(workout, t.locale);
  // Back where you came from: this page is reachable from both Train and the
  // library, and an arrow that lands somewhere else is a small betrayal.
  const cameFromTrain = (await searchParams)?.from === "train";

  return (
    <div>
      <Link
        href={cameFromTrain ? "/train" : "/library"}
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted"
      >
        <ChevronLeftIcon size={16} /> {cameFromTrain ? t("nav.train") : t("library.title")}
      </Link>

      <h1 className="pb-1 pt-2 text-2xl font-bold tracking-tight">
        {workoutName(workout, t.locale)}
      </h1>
      {description && <p className="mb-3 text-sm text-muted">{description}</p>}
      <p className="mb-4 inline-flex items-center gap-1 text-sm text-faint">
        <ClockIcon size={14} /> {t("library.estMinutes", { min: workout.estimatedMinutes })}
      </p>

      {/* Which muscles this workout hits */}
      <Card className="mb-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("library.targetsMuscles")}
        </h2>
        <BodyMap intensity={intensity} />
      </Card>

      {/* Exercise list */}
      <ul className="mb-6 flex flex-col gap-2">
        {localized.map(({ item, ex }) => (
          <li key={item.id}>
            <Link
              href={`/library/exercise/${ex.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-elev p-3 active:brightness-95"
            >
              <span className="h-12 w-14 shrink-0 rounded-lg bg-elev-2 p-1">
                <ExerciseMedia
                  svgKey={ex.svgKey}
                  imageUrl={ex.imageUrl}
                  alt={ex.name}
                  pref={ctx.user.mediaPref}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-text">{ex.name}</span>
                <span className="tabnum block text-xs text-faint">
                  {item.targetSets} × {" "}
                  {item.targetSeconds
                    ? `${item.targetSeconds} ${t("common.sec")}`
                    : `${item.targetRepsMin ?? "?"}–${item.targetRepsMax ?? "?"} ${t("common.reps")}`}
                  {" · "}
                  {item.restSeconds} {t("common.sec")} {t("common.rest")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Link href={`/train/start/${workout.id}`}>
          <Button size="lg" fullWidth>
            {t("common.startWorkout")}
          </Button>
        </Link>
        <div className="flex gap-2">
          <DuplicateButton workoutId={workout.id} action={duplicateWorkoutAction} />
          {!workout.isTemplate && (
            <Link href={`/library/builder/${workout.id}`} className="flex-1">
              <Button variant="secondary" fullWidth>
                {t("common.edit")}
              </Button>
            </Link>
          )}
        </div>
        {localized.length === 0 && <CardMuted>{t("library.empty")}</CardMuted>}
      </div>

      {/* Tell Mimir about an ailment or a wish and let him adjust this workout */}
      <section className="mt-6">
        <AdaptWorkout workoutId={workout.id} onApply={applyAdaptationAction} />
      </section>
    </div>
  );
}
