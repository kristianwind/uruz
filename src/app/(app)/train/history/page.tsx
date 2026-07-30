import Link from "next/link";
import { localizedTitle } from "@/lib/i18n/metadata";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listCompletedSessions, listSessionSets } from "@/lib/db/repo/sessions";
import { getWorkout } from "@/lib/db/repo/workouts";
import { getT } from "@/lib/i18n/server";
import { workoutName } from "@/lib/domain/localize";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("train.history");

/**
 * Everything already logged.
 *
 * The numbers were being aggregated into statistics and then never shown as
 * themselves — so a workout logged wrong stayed wrong, because there was no
 * screen on which to find it again.
 */
export default async function HistoryPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const sessions = listCompletedSessions(ctx.user.id);

  const rows = sessions.map((s) => {
    const sets = listSessionSets(s.id);
    const workout = s.workoutId ? getWorkout(s.workoutId) : null;
    const minutes =
      s.endedAt && s.startedAt
        ? Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))
        : null;
    return {
      id: s.id,
      startedAt: s.startedAt,
      name: workout ? workoutName(workout, t.locale) : t("train.freeWorkout"),
      sets: sets.filter((x) => !x.isWarmup).length,
      minutes,
    };
  });

  return (
    <div className="lg:max-w-3xl">
      <Link href="/train" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("nav.train")}
      </Link>
      <PageHeader title={t("train.history")} />

      {rows.length === 0 ? (
        <CardMuted>{t("train.historyEmpty")}</CardMuted>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/train/history/${r.id}`}>
                <Card interactive className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{r.name}</CardTitle>
                    <CardMuted className="tabnum">
                      {new Date(r.startedAt).toLocaleDateString(
                        t.locale === "da" ? "da-DK" : "en-GB",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                      {" · "}
                      {t("train.sessionSets", { count: r.sets })}
                      {r.minutes ? ` · ${t("train.sessionDuration", { min: r.minutes })}` : ""}
                    </CardMuted>
                  </div>
                  <ChevronRightIcon className="shrink-0 text-muted" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
