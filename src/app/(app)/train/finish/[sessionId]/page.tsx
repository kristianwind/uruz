import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/session";
import { getSession, listSessionSets } from "@/lib/db/repo/sessions";
import { FinishForm } from "@/components/train/FinishForm";
import { PageHeader } from "@/components/app/PageHeader";
import { totalVolume } from "@/lib/domain/strength";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Afslut træning" };

export default async function FinishPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const session = getSession(sessionId);
  if (!session || session.userId !== ctx.user.id) redirect("/train");

  const sets = listSessionSets(session.id);
  const minutes = Math.max(
    1,
    Math.round(
      (new Date(session.endedAt ?? new Date().toISOString()).getTime() -
        new Date(session.startedAt).getTime()) /
        60000,
    ),
  );

  const summary = {
    sets: sets.filter((s) => !s.isWarmup).length,
    volume: totalVolume(sets),
    prs: sets.filter((s) => s.isPr).length,
    minutes,
  };

  return (
    <div>
      <PageHeader title={t("train.sessionSummary")} subtitle={t("train.howWasIt")} />
      <FinishForm sessionId={session.id} summary={summary} />
    </div>
  );
}
