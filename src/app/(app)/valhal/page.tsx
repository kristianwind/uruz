import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Card, CardMuted } from "@/components/ui/Card";
import { BadgeGrid, type BadgeView } from "@/components/valhal/BadgeGrid";
import { Leaderboard } from "@/components/valhal/Leaderboard";
import { ShieldIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listBadges, listUserBadges } from "@/lib/db/repo/badges";
import {
  buildLeaderboard,
  syncGamification,
  loadUserData,
} from "@/lib/domain/gamification-service";
import { milestoneProgress, travellerOfTheWeek } from "@/lib/domain/gamification";
import { lifetimeTotals } from "@/lib/domain/stats";
import { rankForLevel } from "@/lib/domain/ranks";
import { RANK_SLUGS } from "@/lib/domain/types";
import { getT } from "@/lib/i18n/server";
import { fmtNum } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Valhal" };

export default async function ValhalPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  // Recompute awards from history on view, so badges are never stale.
  syncGamification(ctx.user.id);

  const entries = buildLeaderboard(ctx.hall.id);
  const traveller = travellerOfTheWeek(entries);

  const allBadges = listBadges();
  const mine = new Map(listUserBadges(ctx.user.id).map((b) => [b.badgeId, b]));
  const badgeViews: BadgeView[] = allBadges.map((b) => {
    const owned = mine.get(b.id);
    return {
      slug: b.slug,
      name: b.name,
      description: b.description,
      runeSymbol: b.runeSymbol,
      tier: b.tier,
      earned: !!owned?.earnedAt,
      progress: owned?.progress ?? 0,
    };
  });
  const earnedCount = badgeViews.filter((b) => b.earned).length;

  const totals = lifetimeTotals(loadUserData(ctx.user.id));
  const milestone = milestoneProgress(totals.volume);

  // Rank names for every level, resolved once in the active locale.
  const rankNames: Record<number, { name: string; color: string }> = {};
  RANK_SLUGS.forEach((_, level) => {
    const info = rankForLevel(level, t.locale);
    rankNames[level] = { name: info.name, color: info.color };
  });

  if (entries.length === 0) {
    return (
      <div>
        <PageHeader title={t("valhal.title")} />
        <EmptyState icon={<ShieldIcon size={40} />} title={t("valhal.empty")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("valhal.title")} subtitle={t("valhal.leaderboard")} />

      <div className="flex flex-col gap-6 lg:block lg:columns-2 lg:gap-6 lg:[&>*]:mb-6 lg:[&>*]:break-inside-avoid">
      {/* Traveller of the week */}
      {traveller && (
        <Card className="flex items-center gap-3 border-accent/40 bg-accent-soft/30">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="text-sm font-semibold text-text">{t("valhal.travelerOfWeek")}</p>
            <CardMuted>
              {/* "1 træninger" reads like a bug to anyone who speaks the
                  language, and this line is the first thing on the page. */}
              {traveller.displayName} —{" "}
              {t(
                traveller.sessionsThisWeek === 1
                  ? "valhal.sessionsCount_one"
                  : "valhal.sessionsCount_other",
                { count: traveller.sessionsThisWeek },
              )}
            </CardMuted>
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      <section>
        <Leaderboard entries={entries} currentUserId={ctx.user.id} rankNames={rankNames} />
      </section>

      {/* Milestone progress */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-muted">{t("valhal.milestones")}</h2>
        {milestone.passed && (
          <p className="mb-2 text-sm text-text">
            {milestone.passed.emoji} {t("valhal.milestonePassed")}{" "}
            {t(`valhal.milestones_units.${milestone.passed.key}`)}
          </p>
        )}
        {milestone.next && (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-elev-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.round(milestone.progressToNext * 100)}%` }}
              />
            </div>
            <CardMuted className="mt-2">
              {milestone.next.emoji} {t("valhal.milestoneNext")}:{" "}
              {t(`valhal.milestones_units.${milestone.next.key}`)} —{" "}
              {t("valhal.toGo", {
                kg: fmtNum(Math.max(0, Math.round(milestone.next.kg - totals.volume)), 0),
              })}
            </CardMuted>
          </>
        )}
      </Card>

      {/* Runes */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">
            {t("valhal.badges")}
          </h2>
          <span className="text-xs text-muted">
            {t("valhal.badgesEarned", { earned: earnedCount, total: badgeViews.length })}
          </span>
        </div>
        <BadgeGrid badges={badgeViews} />
      </section>
      </div>
    </div>
  );
}
