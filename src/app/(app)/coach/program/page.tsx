import Link from "next/link";
import { localizedTitle } from "@/lib/i18n/metadata";
import { PageHeader } from "@/components/app/PageHeader";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { ProgramWizard } from "@/components/coach/ProgramWizard";
import { requireContext } from "@/lib/auth/session";
import { listExercises } from "@/lib/db/repo/exercises";
import { getT } from "@/lib/i18n/server";
import { buildProgramAction } from "./actions";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("coach.programTitle");

export default async function ProgramPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  // Only offer equipment the library can actually train with, so a plan can
  // never be built around something that has no exercises behind it.
  const present = [...new Set(listExercises().map((e) => e.equipment))];
  const equipment = present.map((slug) => ({ slug, label: t(`equipment.${slug}`) }));

  return (
    <div className="flex flex-col gap-4 lg:max-w-2xl">
      <div>
        <Link href="/train" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
          <ChevronLeftIcon size={16} /> {t("nav.train")}
        </Link>
        <PageHeader title={t("coach.programTitle")} subtitle={t("coach.programSubtitle")} />
      </div>

      <ProgramWizard equipment={equipment} onBuild={buildProgramAction} />
    </div>
  );
}
