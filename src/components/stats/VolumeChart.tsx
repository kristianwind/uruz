"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useT } from "@/components/app/I18nProvider";
import { fmtNum } from "@/lib/utils";

export interface VolumePoint {
  key: string;
  volume: number;
  sessions: number;
}

/**
 * Weekly tonnage. Bars (not a line) because each week is a discrete quantity
 * you either did or didn't do — a line would imply values in between.
 */
export function VolumeChart({ data }: { data: VolumePoint[] }) {
  const t = useT();

  // Show the last 12 buckets so the bars stay legible on a phone.
  const recent = data.slice(-12);

  const label = (key: string) => {
    const d = new Date(key);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={recent} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="key"
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
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-elev-2)" }}
            contentStyle={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              color: "var(--text)",
              fontSize: 12,
            }}
            labelFormatter={(key: string) => `${t("common.week")} ${label(String(key))}`}
            formatter={(value: number) => [`${fmtNum(value, 0)} kg`, t("stats.volume")]}
          />
          <Bar dataKey="volume" fill="var(--accent)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
