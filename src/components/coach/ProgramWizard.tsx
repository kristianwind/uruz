"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/app/I18nProvider";

/**
 * Five questions, then a plan.
 *
 * Deliberately not a chat. A conversation would be more impressive and worse:
 * you would have to know what to say, and the answers Kvasir actually needs are
 * four numbers and a sentence. This is the shortest path from "I do not know
 * what I should be doing" to a workout you can walk into a gym and do.
 */
export function ProgramWizard({
  equipment,
  onBuild,
}: {
  /** Equipment slugs present in the library, with their translated labels. */
  equipment: { slug: string; label: string }[];
  onBuild: (input: {
    goal: string;
    daysPerWeek: number;
    minutes: number;
    equipment: string[];
  }) => Promise<{ programId: string; fromModel: boolean; note: string }>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [goal, setGoal] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [minutes, setMinutes] = useState(45);
  const [gear, setGear] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (slug: string) =>
    setGear((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));

  const build = () =>
    startTransition(async () => {
      setError(null);
      try {
        const res = await onBuild({ goal, daysPerWeek, minutes, equipment: gear });
        setNote(res.note);
        router.push("/train");
        router.refresh();
      } catch {
        setError(t("errors.generic"));
      }
    });

  const choice = (value: number, current: number, set: (v: number) => void, label: string) => (
    <button
      key={label}
      type="button"
      onClick={() => set(value)}
      aria-pressed={value === current}
      className={
        value === current
          ? "rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-semibold text-accent"
          : "rounded-lg border border-border px-3 py-2 text-sm text-muted"
      }
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div>
          <CardTitle>{t("coach.programGoal")}</CardTitle>
          <CardMuted>{t("coach.programGoalHint")}</CardMuted>
        </div>
        {/* No label: the card's title is the question, and repeating it under
            itself reads like two different fields. */}
        <Input
          name="goal"
          aria-label={t("coach.programGoal")}
          value={goal}
          placeholder={t("coach.programGoalPlaceholder")}
          onChange={(e) => setGoal(e.target.value)}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle>{t("coach.programDays")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) =>
            choice(n, daysPerWeek, setDaysPerWeek, String(n)),
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle>{t("coach.programMinutes")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {[20, 30, 45, 60, 90].map((n) =>
            choice(n, minutes, setMinutes, `${n} ${t("common.min")}`),
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <div>
          <CardTitle>{t("coach.programEquipment")}</CardTitle>
          {/* Nothing ticked means an ordinary gym — the common case should not
              require any work. */}
          <CardMuted>{t("coach.programEquipmentHint")}</CardMuted>
        </div>
        <div className="flex flex-wrap gap-2">
          {equipment.map((e) => (
            <button
              key={e.slug}
              type="button"
              onClick={() => toggle(e.slug)}
              aria-pressed={gear.includes(e.slug)}
              className={
                gear.includes(e.slug)
                  ? "rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-semibold text-accent"
                  : "rounded-lg border border-border px-3 py-2 text-sm text-muted"
              }
            >
              {e.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardMuted>{t("coach.programConstraintsNote")}</CardMuted>
      </Card>

      <Button size="lg" onClick={build} disabled={pending}>
        {pending ? t("coach.thinking") : t("coach.programBuild")}
      </Button>

      {note && <p className="text-sm text-muted">{note}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
