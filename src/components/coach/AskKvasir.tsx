"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";
import { CoachText } from "./CoachText";

interface Exchange {
  question: string;
  answer: string | null;
  failed?: boolean;
}

/**
 * "Spørg Kvasir" — a small chat against the user's own data.
 *
 * Kept deliberately simple: one question at a time, no history to scroll. The
 * coach is an aid between sets, not a chat app.
 */
export function AskKvasir({ suggestions }: { suggestions: string[] }) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion("");
    setExchanges((prev) => [{ question: q, answer: null }, ...prev]);

    try {
      const res = await fetch("/api/coach/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = res.ok ? await res.json() : null;
      setExchanges((prev) =>
        prev.map((e, i) =>
          i === 0
            ? { ...e, answer: data?.body ?? t("errors.generic"), failed: !data?.body }
            : e,
        ),
      );
    } catch {
      setExchanges((prev) =>
        prev.map((e, i) => (i === 0 ? { ...e, answer: t("errors.generic"), failed: true } : e)),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="flex flex-col gap-2"
      >
        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("coach.askPlaceholder")}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-border bg-elev-2 p-3 text-base text-text placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <Button type="submit" disabled={busy || !question.trim()}>
          {busy ? t("coach.thinking") : t("coach.ask")}
        </Button>
      </form>

      {/* Starter prompts, so the empty state isn't a blank box */}
      {exchanges.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => void ask(s)}
              className="rounded-full border border-border bg-elev-2 px-3 py-1.5 text-left text-xs text-muted active:brightness-95"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {exchanges.map((e, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">{e.question}</p>
          {e.answer === null ? (
            <p className="animate-pulse text-sm text-faint">{t("coach.thinking")}</p>
          ) : (
            <CoachText
              text={e.answer}
              className={cn(
                "text-sm leading-relaxed",
                e.failed ? "text-warning" : "text-muted",
              )}
            />
          )}
        </Card>
      ))}
    </div>
  );
}
