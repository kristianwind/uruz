import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { ExerciseEditor } from "@/components/admin/ExerciseEditor";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listExercises } from "@/lib/db/repo/exercises";
import { getT } from "@/lib/i18n/server";
import { updateExerciseAction } from "../actions";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("titles.adminLibraryTitle");

/** Admin editing of the shared exercise library (spec §9). */
export default async function AdminLibraryPage() {
  const ctx = await requireContext();
  if (ctx.user.role !== "admin") redirect("/me");
  const t = await getT(ctx.user.localePref);

  const exercises = listExercises().map((e) => ({
    slug: e.slug,
    nameDa: e.nameDa,
    nameEn: e.nameEn,
    imageUrl: e.imageUrl,
    svgKey: e.svgKey,
  }));

  return (
    <div>
      <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("admin.title")}
      </Link>
      <PageHeader title={t("admin.library")} subtitle={`${exercises.length} ${t("library.exercises").toLowerCase()}`} />
      <ul className="flex flex-col gap-2">
        {exercises.map((e) => (
          <ExerciseEditor key={e.slug} exercise={e} onSave={updateExerciseAction} />
        ))}
      </ul>
    </div>
  );
}
