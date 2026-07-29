import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, PlusIcon, ClockIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listHallWorkouts, getWorkoutExercises } from "@/lib/db/repo/workouts";
import { getT } from "@/lib/i18n/server";
import { workoutName, workoutDescription } from "@/lib/domain/localize";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("library.title");

/**
 * Library hub: the hall's workouts (templates + own) and a way into the
 * exercise catalogue and the builder (spec §5, layers 1–2).
 */
export default async function LibraryPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const workouts = listHallWorkouts(ctx.hall.id);
  const templates = workouts.filter((w) => w.isTemplate);
  const own = workouts.filter((w) => !w.isTemplate);

  const renderList = (list: typeof workouts) => (
    <ul className="flex flex-col gap-2">
      {list.map((w) => (
        <li key={w.id}>
          <Link href={`/library/workout/${w.id}`}>
            <Card interactive className="flex items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="truncate">{workoutName(w, t.locale)}</CardTitle>
                <CardMuted className="mt-0.5 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon size={14} /> {t("library.estMinutes", { min: w.estimatedMinutes })}
                  </span>
                  <span>
                    {getWorkoutExercises(w.id).length} {t("library.exercises").toLowerCase()}
                  </span>
                </CardMuted>
              </div>
              <ChevronRightIcon className="shrink-0 text-muted" />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <PageHeader title={t("library.title")} />

      <Link href="/library/exercises" className="mb-6 block">
        <Card interactive className="flex items-center justify-between">
          <div>
            <CardTitle>{t("library.exercises")}</CardTitle>
            <CardMuted>{t("library.filterMuscle")} · {t("library.filterEquipment")}</CardMuted>
          </div>
          <ChevronRightIcon className="text-muted" />
        </Card>
      </Link>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("library.templates")}
        </h2>
        {renderList(templates)}
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">
            {t("library.myWorkouts")}
          </h2>
          <Link href="/library/builder/new">
            <Button size="sm" variant="secondary">
              <PlusIcon size={16} /> {t("library.newWorkout")}
            </Button>
          </Link>
        </div>
        {own.length > 0 ? (
          renderList(own)
        ) : (
          <Card className="text-center">
            <CardMuted>{t("library.buildYourOwn")}</CardMuted>
          </Card>
        )}
      </section>
    </div>
  );
}
