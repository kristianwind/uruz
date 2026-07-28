import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Card, CardMuted } from "@/components/ui/Card";
import { StatTile } from "@/components/stats/StatTile";
import { VolumeChart } from "@/components/stats/VolumeChart";
import { ExerciseProgressChart } from "@/components/stats/ExerciseProgressChart";
import { Heatmap } from "@/components/stats/Heatmap";
import { MuscleBalance } from "@/components/stats/MuscleBalance";
import { BodyMap, muscleIntensity } from "@/components/exercise/BodyMap";
import { ChartIcon, BoltIcon, FlameIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listCompletedSessions, listSessionSets, listPersonalRecords } from "@/lib/db/repo/sessions";
import { listExercises } from "@/lib/db/repo/exercises";
import { exerciseName } from "@/lib/domain/localize";
import { getT } from "@/lib/i18n/server";
import { fmtNum } from "@/lib/utils";
import * as S from "@/lib/domain/stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistik" };

const WEEKLY_GOAL = 2;

export default async function StatsPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const sessions = listCompletedSessions(ctx.user.id);
  const data: S.SessionWithSets[] = sessions.map((session) => ({
    session,
    sets: listSessionSets(session.id),
  }));

  if (data.length === 0) {
    return (
      <div>
        <PageHeader title={t("stats.title")} subtitle={t("stats.overview")} />
        <EmptyState
          icon={<ChartIcon size={40} />}
          title={t("stats.noData")}
          description={t("train.noPlanDesc")}
        />
      </div>
    );
  }

  const exercises = listExercises();
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const nameOf = (id: string) => {
    const ex = exMap.get(id);
    return ex ? exerciseName(ex, t.locale) : id;
  };

  // ---- factual ----
  const totals = S.lifetimeTotals(data);
  const weeks = S.bucketByPeriod(data, "week");
  const streak = S.weekStreak(data);
  const consistency = S.consistencyScore(data, WEEKLY_GOAL);
  const thisWeek = S.sessionsThisWeek(data);
  const heatmap = S.attendanceHeatmap(data, 119);
  const byMuscle = S.volumeByMuscle(data, exMap);
  const balance = S.balanceCheck(data, exMap);
  const monthCompare = S.compareVolume(data, "month");
  const bodyweight = S.bodyweightTrend(data);
  const records = listPersonalRecords(ctx.user.id);

  // Exercises with enough history to plot, most-trained first.
  const frequency = S.exerciseFrequency(data);
  const progressSeries = frequency
    .map((f) => ({
      exerciseId: f.exerciseId,
      name: nameOf(f.exerciseId),
      unit: exMap.get(f.exerciseId)?.unit ?? "kg",
      points: S.exerciseProgress(data, f.exerciseId),
    }))
    .filter((s) => s.points.length >= 2);

  // ---- fun ----
  const funny = S.funnyUnitFor(totals.volume);
  const mostTrained = frequency[0];
  const leastTrained = frequency.length > 1 ? frequency[frequency.length - 1] : null;
  const onThisDay = mostTrained ? S.onThisDay(data, mostTrained.exerciseId, 4) : null;

  // Best current PR per exercise (max weight), most recent first.
  const bestByExercise = new Map<string, number>();
  for (const pr of records) {
    if (pr.type !== "max_weight") continue;
    const best = bestByExercise.get(pr.exerciseId) ?? 0;
    if (pr.value > best) bestByExercise.set(pr.exerciseId, pr.value);
  }

  const latestBodyweight = bodyweight.length ? bodyweight[bodyweight.length - 1].weight : 0;

  const weekdayLabels =
    t.locale === "en"
      ? ["M", "T", "W", "T", "F", "S", "S"]
      : ["M", "T", "O", "T", "F", "L", "S"];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("stats.title")} subtitle={t("stats.overview")} />

      {/* Headline numbers */}
      <section className="grid grid-cols-3 gap-2">
        <StatTile label={t("stats.totalSessions")} value={String(totals.sessions)} accent="gold" />
        <StatTile
          label={t("stats.tonnage")}
          value={`${fmtNum(Math.round(totals.volume / 1000), 1)}t`}
          accent="gold"
        />
        <StatTile
          label={t("stats.streakWeeks")}
          value={String(streak.currentWeeks)}
          sub={`${t("stats.longest")}: ${streak.longestWeeks}`}
          accent="green"
        />
        <StatTile label={t("stats.totalSets")} value={fmtNum(totals.sets, 0)} />
        <StatTile label={t("stats.totalReps")} value={fmtNum(totals.reps, 0)} />
        <StatTile
          label={t("stats.totalTime")}
          value={`${Math.round(totals.minutes / 60)}`}
          sub={t("stats.hours")}
        />
      </section>

      {/* Consistency — the thing the app rewards most */}
      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-muted">{t("stats.consistencyScore")}</h2>
          <span className="tabnum text-2xl font-bold text-accent">{consistency}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-elev-2">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${consistency}%` }}
          />
        </div>
        <CardMuted className="mt-2">
          {t("stats.thisWeek")}: {thisWeek}/{WEEKLY_GOAL} {t("stats.perWeek")}
        </CardMuted>
      </Card>

      {/* Fun insights (spec §13) */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("stats.funInsights")}
        </h2>
        <div className="flex flex-col gap-2">
          {funny && (
            <Card className="flex items-center gap-3 border-accent/40 bg-accent-soft/30">
              <span className="text-3xl">{funny.unit.emoji}</span>
              <div>
                <p className="font-semibold text-text">
                  {t("stats.youveLifted")} {fmtNum(Math.round(totals.volume), 0)} kg
                </p>
                <CardMuted>
                  {t("stats.liftedUnits", {
                    count: fmtNum(funny.count, 1),
                    unit: t(`stats.units.${funny.unit.key}`),
                  })}
                </CardMuted>
              </div>
            </Card>
          )}

          {onThisDay && (
            <Card className="flex items-center gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <p className="text-sm font-semibold text-text">{t("stats.onThisDay")}</p>
                <CardMuted>
                  {nameOf(onThisDay.exerciseId)}: {onThisDay.thenWeight} kg →{" "}
                  {onThisDay.nowWeight} kg{" "}
                  <span className={onThisDay.percentChange >= 0 ? "text-success" : "text-warning"}>
                    ({onThisDay.percentChange >= 0 ? "+" : ""}
                    {onThisDay.percentChange}%)
                  </span>
                </CardMuted>
              </div>
            </Card>
          )}

          {mostTrained && (
            <Card className="flex items-center gap-3">
              <span className="text-2xl">💪</span>
              <div>
                <p className="text-sm font-semibold text-text">{t("stats.mostFaithful")}</p>
                <CardMuted>
                  {nameOf(mostTrained.exerciseId)} — {mostTrained.sessions}×
                </CardMuted>
              </div>
            </Card>
          )}

          {leastTrained && leastTrained.exerciseId !== mostTrained?.exerciseId && (
            <Card className="flex items-center gap-3">
              <span className="text-2xl">😅</span>
              <div>
                <p className="text-sm font-semibold text-text">{t("stats.mostSkipped")}</p>
                <CardMuted>
                  {nameOf(leastTrained.exerciseId)} — {leastTrained.sessions}×
                </CardMuted>
              </div>
            </Card>
          )}

          {totals.prs > 0 && (
            <Card className="flex items-center gap-3">
              <BoltIcon size={22} className="text-success" />
              <div>
                <p className="text-sm font-semibold text-text">{t("stats.personalRecords")}</p>
                <CardMuted>{totals.prs}×</CardMuted>
              </div>
            </Card>
          )}

          {streak.currentWeeks >= 2 && (
            <Card className="flex items-center gap-3">
              <FlameIcon size={22} className="text-accent" />
              <div>
                <p className="text-sm font-semibold text-text">{t("stats.streakWeeks")}</p>
                <CardMuted>
                  {streak.currentWeeks} {t("stats.weeks")}
                </CardMuted>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Volume over time */}
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-muted">{t("stats.volumeOverTime")}</h2>
        {monthCompare.percentChange !== null && (
          <CardMuted className="mb-2">
            {t("stats.vsLastMonth")}:{" "}
            <span className={monthCompare.percentChange >= 0 ? "text-success" : "text-warning"}>
              {monthCompare.percentChange >= 0 ? "+" : ""}
              {monthCompare.percentChange}%
            </span>
          </CardMuted>
        )}
        <VolumeChart data={weeks} />
      </Card>

      {/* Per-exercise progress */}
      {progressSeries.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-muted">{t("stats.progress")}</h2>
          <ExerciseProgressChart series={progressSeries} />
        </Card>
      )}

      {/* Attendance */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">{t("stats.attendance")}</h2>
        <Heatmap days={heatmap} weekdayLabels={weekdayLabels} />
      </Card>

      {/* Muscle balance + body map */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-muted">{t("stats.muscleBalance")}</h2>
        <BodyMap
          intensity={muscleIntensity(
            data.flatMap(({ sets }) =>
              sets
                .filter((s) => !s.isWarmup)
                .flatMap((s) => {
                  const ex = exMap.get(s.exerciseId);
                  return ex ? [ex.primaryMuscles] : [];
                }),
            ),
          )}
          className="mb-3"
        />
        <MuscleBalance
          bars={byMuscle.slice(0, 6).map((m) => ({
            muscle: m.muscle,
            label: t(`muscles.${m.muscle}`),
            volume: m.volume,
          }))}
        />
        <CardMuted className={balance.imbalanced ? "mt-3 text-warning" : "mt-3"}>
          {balance.imbalanced ? t("stats.balanceWarn") : t("stats.balanceOk")}
        </CardMuted>
      </Card>

      {/* Personal records board */}
      {bestByExercise.size > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-muted">{t("stats.personalRecords")}</h2>
          <ul className="divide-y divide-border">
            {[...bestByExercise.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([exerciseId, value]) => {
                const ex = exMap.get(exerciseId);
                const level = ex
                  ? S.strengthLevel(ex.category, value, latestBodyweight)
                  : null;
                return (
                  <li key={exerciseId} className="flex items-center justify-between py-2">
                    <span className="min-w-0 truncate text-sm text-text">{nameOf(exerciseId)}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {level && (
                        <span className="rounded-full bg-elev-2 px-2 py-0.5 text-[10px] text-faint">
                          {t(
                            level === "avanceret"
                              ? "stats.levelAvanceret"
                              : level === "oevet"
                                ? "stats.levelOevet"
                                : "stats.levelBegynder",
                          )}
                        </span>
                      )}
                      <span className="tabnum font-semibold text-accent">{value} kg</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </Card>
      )}

      {/* Bodyweight */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-muted">{t("stats.bodyweight")}</h2>
        {bodyweight.length >= 2 ? (
          <p className="tabnum text-2xl font-bold text-text">
            {fmtNum(latestBodyweight, 1)} kg{" "}
            <span
              className={
                latestBodyweight - bodyweight[0].weight >= 0 ? "text-muted" : "text-success"
              }
            >
              <span className="text-sm font-normal">
                ({latestBodyweight - bodyweight[0].weight >= 0 ? "+" : ""}
                {fmtNum(latestBodyweight - bodyweight[0].weight, 1)} kg)
              </span>
            </span>
          </p>
        ) : (
          <CardMuted>{t("stats.noBodyweight")}</CardMuted>
        )}
      </Card>

      {/* Export */}
      <Link
        href="/api/export/csv"
        className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-border bg-elev py-3 text-sm font-medium text-accent"
      >
        {t("stats.export")} (CSV)
      </Link>
    </div>
  );
}
