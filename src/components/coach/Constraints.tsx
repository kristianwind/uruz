"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardMuted } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";

export interface ConstraintView {
  id: string;
  kind: "skavank" | "oenske";
  body: string;
}

/**
 * The user's standing ailments and wishes.
 *
 * Visible and removable on purpose: Kvasir silently factors these into every
 * suggestion, so the user must be able to see exactly what he is taking into
 * account — and say when a niggle has passed.
 */
export function Constraints({
  constraints,
  onAdd,
  onResolve,
}: {
  constraints: ConstraintView[];
  onAdd: (input: { body: string }) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
        {t("coach.constraints")}
      </h2>

      <Card className="flex flex-col gap-3">
        {constraints.length === 0 ? (
          <CardMuted>{t("coach.constraintsEmpty")}</CardMuted>
        ) : (
          <ul className="flex flex-col gap-2">
            {constraints.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-2 rounded-lg border border-border bg-elev-2 p-2.5"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    c.kind === "skavank"
                      ? "bg-danger-soft text-danger"
                      : "bg-accent-soft text-accent",
                  )}
                >
                  {c.kind === "skavank" ? t("coach.constraintAilment") : t("coach.constraintWish")}
                </span>
                <span className="min-w-0 flex-1 text-sm text-text">{c.body}</span>
                <button
                  type="button"
                  title={t("coach.constraintResolve")}
                  aria-label={t("coach.constraintResolve")}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await onResolve(c.id);
                      router.refresh();
                    })
                  }
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-text"
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            const body = text.trim();
            setText("");
            startTransition(async () => {
              await onAdd({ body });
              router.refresh();
            });
          }}
          className="flex gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("coach.constraintPlaceholder")}
            maxLength={300}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={pending || !text.trim()}>
            {t("coach.addConstraint")}
          </Button>
        </form>
      </Card>
    </section>
  );
}
