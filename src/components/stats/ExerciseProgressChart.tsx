"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";

export interface ProgressSeries {
  exerciseId: string;
  name: string;
  unit: "kg" | "sek" | "reps" | "km";
  points: { date: string; topWeight: number; best1RM: number; bestSeconds: number }[];
}

/**
 * Progress for one exercise over time, with a picker for which exercise.
 *
 * Shows top weight and estimated 1RM together: the top weight is what actually
 * happened, the 1RM estimate is what it implies — seeing both keeps the
 * estimate honest rather than presenting it as a measured number.
 */
export function ExerciseProgressChart({ series }: { series: ProgressSeries[] }) {
  const t = useT();
  const [selected, setSelected] = useState(series[0]?.exerciseId ?? "");
  const current = series.find((s) => s.exerciseId === selected) ?? series[0];

  if (!current || current.points.length < 2) {
    return <p className="py-6 text-center text-sm text-muted">{t("stats.noData")}</p>;
  }

  const timed = current.unit === "sek";
  const label = (date: string) => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Compute the y-range explicitly. Recharts' "dataMin - 5" string form does
  // not resolve reliably across several series, and a broken domain silently
  // renders an empty plot rather than erroring.
  const values = current.points.flatMap((p) =>
    timed ? [p.bestSeconds] : [p.topWeight, p.best1RM],
  );
  const lo = Math.max(0, Math.floor(Math.min(...values) - 5));
  const hi = Math.ceil(Math.max(...values) + 5);

  return (
    <div>
      <label className="sr-only" htmlFor="progress-exercise">
        {t("stats.pickExercise")}
      </label>
      <select
        id="progress-exercise"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className={cn(
          "mb-3 h-11 w-full rounded-xl border border-border bg-elev-2 px-3",
          "text-base text-text focus:border-accent focus:outline-none",
        )}
      >
        {series.map((s) => (
          <option key={s.exerciseId} value={s.exerciseId}>
            {s.name}
          </option>
        ))}
      </select>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={current.points} margin={{ top: 8, right: 6, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={label}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[lo, hi]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12,
                color: "var(--text)",
                fontSize: 12,
              }}
              labelFormatter={(d: string) => label(String(d))}
              formatter={(value: number, key: string) => [
                timed ? `${Math.round(value)} ${t("common.sec")}` : `${Math.round(value * 10) / 10} kg`,
                key === "best1RM" ? t("stats.est1rm") : timed ? t("common.sec") : t("stats.topWeight"),
              ]}
            />
            {/* Each Line must be a *direct* child of LineChart — Recharts does
                not look inside fragments when collecting its series. */}
            {timed && (
              <Line
                type="monotone"
                dataKey="bestSeconds"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--accent)" }}
                isAnimationActive={false}
              />
            )}
            {!timed && (
              <Line
                type="monotone"
                dataKey="topWeight"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--accent)" }}
                isAnimationActive={false}
              />
            )}
            {!timed && (
              <Line
                type="monotone"
                dataKey="best1RM"
                stroke="var(--success)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!timed && (
        <div className="mt-2 flex justify-center gap-4 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent" /> {t("stats.topWeight")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-success" />{" "}
            {t("stats.est1rm")}
          </span>
        </div>
      )}
    </div>
  );
}
