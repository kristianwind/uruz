import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { getExerciseBySlug } from "@/lib/db/repo/exercises";
import { localizeExercise } from "@/lib/domain/localize";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Exercise detail: how to do it, cues, and a safer variation (spec §5). */
export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const raw = getExerciseBySlug(slug);
  if (!raw) notFound();
  const ex = localizeExercise(raw, t.locale);

  return (
    <div>
      <Link
        href="/library/exercises"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted"
      >
        <ChevronLeftIcon size={16} /> {t("library.exercises")}
      </Link>

      <h1 className="pb-1 pt-2 text-2xl font-bold tracking-tight">{ex.name}</h1>
      <p className="mb-4 text-sm text-muted">
        {t(`muscles.${ex.category}`)} · {t(`equipment.${ex.equipment}`)}
      </p>

      <div className="mb-6 h-44 rounded-xl border border-border bg-elev p-3">
        <ExerciseMedia
          svgKey={ex.svgKey}
          imageUrl={ex.imageUrl}
          alt={ex.name}
          pref={ctx.user.mediaPref}
        />
      </div>

      {ex.steps.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
            {t("library.steps")}
          </h2>
          <ol className="flex flex-col gap-3">
            {ex.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <span className="text-sm text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {ex.cues.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
            {t("library.cues")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {ex.cues.map((cue, i) => (
              <li
                key={i}
                className="rounded-full border border-border bg-elev-2 px-3 py-1.5 text-sm text-text"
              >
                {cue}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ex.saferVariant && (
        <Card className="border-info/40 bg-info/10">
          <h2 className="mb-1 text-sm font-semibold text-info">{t("library.saferVariant")}</h2>
          <p className="text-sm text-muted">{ex.saferVariant}</p>
        </Card>
      )}
    </div>
  );
}
