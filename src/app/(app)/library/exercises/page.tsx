import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { ExerciseBrowser } from "@/components/library/ExerciseBrowser";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listExercises } from "@/lib/db/repo/exercises";
import { localizeExercise } from "@/lib/domain/localize";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("library.exercises");

export default async function ExercisesPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const exercises = listExercises()
    .map((e) => localizeExercise(e, t.locale))
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      category: e.category,
      equipment: e.equipment,
      difficulty: e.difficulty,
      primaryMuscles: e.primaryMuscles,
      svgKey: e.svgKey,
      imageUrl: e.imageUrl,
    }));

  return (
    <div>
      <Link href="/library" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("library.title")}
      </Link>
      <PageHeader title={t("library.exercises")} />
      <ExerciseBrowser exercises={exercises} mediaPref={ctx.user.mediaPref} />
    </div>
  );
}
