"use client";

import { useState } from "react";
import { cn, fmtNum } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import { FlameIcon } from "@/components/ui/icons";
import { sortLeaderboard, type LeaderboardEntry } from "@/lib/domain/gamification";

type Metric = "sessions" | "volume" | "streak" | "week";

/**
 * Friendly competition between hall members (spec §13). Only aggregates are
 * shown — never anyone's raw logs — so a private profile can still take part.
 */
export function Leaderboard({
  entries,
  currentUserId,
  rankNames,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
  rankNames: Record<number, { name: string; color: string }>;
}) {
  const t = useT();
  const [metric, setMetric] = useState<Metric>("sessions");
  const sorted = sortLeaderboard(entries, metric);

  const METRICS: { value: Metric; label: string }[] = [
    { value: "sessions", label: t("valhal.attendance") },
    { value: "volume", label: t("valhal.volume") },
    { value: "streak", label: t("valhal.streak") },
    { value: "week", label: t("stats.thisWeek") },
  ];

  const valueFor = (e: LeaderboardEntry) => {
    switch (metric) {
      case "volume":
        return `${fmtNum(Math.round(e.volume / 1000), 1)}t`;
      case "streak":
        return `${e.currentStreak}`;
      case "week":
        return `${e.sessionsThisWeek}`;
      default:
        return `${e.sessions}`;
    }
  };

  return (
    <div>
      <div
        role="group"
        aria-label={t("valhal.sortBy")}
        className="mb-3 flex gap-1 overflow-x-auto rounded-lg border border-border bg-elev-2 p-0.5"
      >
        {METRICS.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={metric === m.value}
            onClick={() => setMetric(m.value)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              metric === m.value ? "bg-accent text-on-accent" : "text-muted hover:text-text",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ol className="flex flex-col gap-2">
        {sorted.map((e, i) => {
          const rank = rankNames[e.rankLevel] ?? { name: "", color: "var(--text-muted)" };
          const isMe = e.userId === currentUserId;
          return (
            <li
              key={e.userId}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                isMe ? "border-accent bg-accent-soft/30" : "border-border bg-elev",
              )}
            >
              <span className="tabnum w-5 shrink-0 text-center text-sm font-bold text-faint">
                {i + 1}
              </span>
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold"
                style={{ background: `${rank.color}22`, color: rank.color }}
              >
                {e.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-text">
                  {e.displayName}
                  {isMe && <span className="text-faint"> ({t("valhal.you")})</span>}
                </span>
                <span className="block truncate text-xs" style={{ color: rank.color }}>
                  {rank.name}
                </span>
              </span>
              {e.currentStreak > 0 && metric !== "streak" && (
                <span className="flex shrink-0 items-center gap-0.5 text-xs text-accent">
                  <FlameIcon size={13} />
                  {e.currentStreak}
                </span>
              )}
              <span className="tabnum shrink-0 text-lg font-bold text-text">{valueFor(e)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
