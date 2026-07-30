import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, BoltIcon, ClockIcon, PlusIcon } from "@/components/ui/icons";
import { getContext } from "@/lib/auth/session";
import { listTemplates, getWorkoutExercises, getWorkout } from "@/lib/db/repo/workouts";
import { getActiveSession } from "@/lib/db/repo/sessions";
import { getT } from "@/lib/i18n/server";
import { workoutName } from "@/lib/domain/localize";

export const dynamic = "force-dynamic";

export default async function TrainPage() {
  const ctx = await getContext();
  const t = await getT(ctx?.user.localePref);
  if (!ctx) {
    return (
      <div className="pt-10 text-center text-muted">
        <p>{t("errors.unauthorized")}</p>
        <Link href="/welcome" className="mt-4 inline-block text-accent underline">
          {t("auth.welcome")}
        </Link>
      </div>
    );
  }

  const templates = listTemplates(ctx.hall.id);
  const active = getActiveSession(ctx.user.id);
  const activeWorkout = active?.workoutId ? getWorkout(active.workoutId) : null;

  return (
    <div>
      <PageHeader title={t("train.title")} subtitle={t("app.tagline")} />

      {/* Resume an interrupted session — one tap back into the gym flow. */}
      {active && (
        <section className="mb-6 lg:max-w-2xl">
          <Link href={`/train/session/${active.id}`}>
            <Card interactive className="flex items-center justify-between border-accent bg-accent-soft/50">
              <div className="min-w-0">
                <CardTitle className="truncate">{t("train.resumeSession")}</CardTitle>
                <CardMuted className="truncate">
                  {activeWorkout ? workoutName(activeWorkout, t.locale) : t("train.freeWorkout")}
                </CardMuted>
              </div>
              <ChevronRightIcon className="shrink-0 text-accent" />
            </Card>
          </Link>
        </section>
      )}

      {/* Today's workout / quick start */}
      <section aria-labelledby="today-h" className="mb-6 lg:max-w-2xl">
        <h2 id="today-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("train.todaysWorkout")}
        </h2>
        <Link href="/train/free">
          <Card interactive className="flex items-center justify-between bg-accent-soft/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-on-accent">
                <BoltIcon size={22} />
              </span>
              <div>
                <CardTitle>{t("train.freeWorkout")}</CardTitle>
                <CardMuted>{t("train.freeWorkoutDesc")}</CardMuted>
              </div>
            </div>
            <ChevronRightIcon className="text-muted" />
          </Card>
        </Link>
      </section>

      {/* Template picker */}
      <section aria-labelledby="choose-h">
        <h2 id="choose-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("train.chooseWorkout")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {templates.map((w) => {
            const setCount = getWorkoutExercises(w.id).length;
            return (
              <li key={w.id}>
                {/* To the workout, not into it. Tapping a name used to start
                    a session immediately, so there was no way to look at what
                    was in one — or to change your mind. */}
                <Link href={`/library/workout/${w.id}?from=train`}>
                  <Card interactive className="flex items-center justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{workoutName(w, t.locale)}</CardTitle>
                      <CardMuted className="mt-0.5 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon size={14} /> {t("library.estMinutes", { min: w.estimatedMinutes })}
                        </span>
                        <span>
                          {setCount} {t("common.sets")}
                        </span>
                      </CardMuted>
                    </div>
                    <ChevronRightIcon className="shrink-0 text-muted" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Two real buttons, not two lines of text. Both were centred links in
            the same grey as the rest of the page, at the bottom of a scroll —
            "Past workouts" is the only way to a logged workout, and it read as
            a footnote. */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-2xl">
          <Link href="/train/history">
            <Button variant="secondary" size="lg" fullWidth>
              <ClockIcon size={18} /> {t("train.history")}
            </Button>
          </Link>
          <Link href="/library">
            <Button variant="secondary" size="lg" fullWidth>
              <PlusIcon size={18} /> {t("library.buildYourOwn")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
