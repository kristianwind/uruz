import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardMuted } from "@/components/ui/Card";
import { AskMimir } from "@/components/coach/AskMimir";
import { AnalyzeButton } from "@/components/coach/AnalyzeButton";
import { Constraints } from "@/components/coach/Constraints";
import { CoachText } from "@/components/coach/CoachText";
import { requireContext } from "@/lib/auth/session";
import { listCoachMessages, markCoachMessagesRead } from "@/lib/db/repo/coach";
import { isAIConfigured } from "@/lib/ai/provider";
import { listConstraints } from "@/lib/db/repo/constraints";
import { addConstraintAction, resolveConstraintAction } from "./actions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mimir" };

export default async function CoachPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const messages = listCoachMessages(ctx.user.id, 20);
  const constraints = listConstraints(ctx.user.id).map((c) => ({
    id: c.id,
    kind: c.kind,
    body: c.body,
  }));
  markCoachMessagesRead(ctx.user.id);
  const aiOn = isAIConfigured();

  const suggestions =
    t.locale === "en"
      ? [
          "I only have 25 min today, what should I do?",
          "My leg press has stalled — what now?",
          "Am I training my back enough?",
        ]
      : [
          "Jeg har kun 25 min i dag, hvad gør jeg?",
          "Mit benpres står stille — hvad nu?",
          "Træner jeg nok ryg?",
        ];

  return (
    <div className="flex flex-col gap-6 lg:max-w-3xl">
      <PageHeader title={t("coach.name")} subtitle={t("coach.askTitle")} />

      <section>
        <AskMimir suggestions={suggestions} />
      </section>

      <Constraints
        constraints={constraints}
        onAdd={addConstraintAction}
        onResolve={resolveConstraintAction}
      />

      <section className="flex flex-col gap-3">
        <AnalyzeButton />
        {!aiOn && (
          <CardMuted className="text-center text-xs">
            {/* Honest about the mode the coach is running in. */}
            {t("coach.disclaimer")}
          </CardMuted>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("coach.weeklyAnalysis")}
        </h2>
        {messages.length === 0 ? (
          <Card>
            <CardMuted>{t("coach.empty")}</CardMuted>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <li key={m.id}>
                <Card>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-faint">
                    {new Date(m.createdAt).toLocaleDateString(t.locale === "en" ? "en-GB" : "da-DK", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <CoachText text={m.body} className="text-sm leading-relaxed text-muted" />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-faint">{t("coach.disclaimer")}</p>
    </div>
  );
}
