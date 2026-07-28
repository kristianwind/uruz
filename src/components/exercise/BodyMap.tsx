import { cn } from "@/lib/utils";

/**
 * Small front/back body map that lights up the muscles a workout hits
 * (spec §5 and §13). Intentionally schematic: it should read at a glance on a
 * phone, not be an anatomy chart.
 *
 * Intensity 0..1 per muscle group drives the fill opacity.
 */

export type MuscleKey =
  | "bryst"
  | "ryg"
  | "skuldre"
  | "biceps"
  | "triceps"
  | "mave"
  | "kerne"
  | "forlaar"
  | "baglaar"
  | "balder"
  | "ben"
  | "kondi";

export function BodyMap({
  intensity,
  className,
}: {
  intensity: Partial<Record<MuscleKey, number>>;
  className?: string;
}) {
  // Merge coarse groups into the specific ones the drawing knows about.
  const level = (...keys: MuscleKey[]) =>
    Math.min(1, Math.max(0, ...keys.map((k) => intensity[k] ?? 0)));

  const fill = (v: number) =>
    v <= 0
      ? "var(--bg-elev-2)"
      : `color-mix(in srgb, var(--accent) ${Math.round(25 + v * 75)}%, var(--bg-elev-2))`;

  const chest = level("bryst");
  const back = level("ryg");
  const shoulders = level("skuldre");
  const biceps = level("biceps");
  const triceps = level("triceps");
  const core = level("mave", "kerne");
  const quads = level("forlaar", "ben");
  const hams = level("baglaar");
  const glutes = level("balder");

  const stroke = { stroke: "var(--border-strong)", strokeWidth: 1 };

  return (
    <svg
      viewBox="0 0 200 120"
      role="img"
      aria-label="Kropskort over trænede muskelgrupper"
      className={cn("w-full", className)}
    >
      {/* ---- Front view ---- */}
      <g transform="translate(10,0)">
        <text x="35" y="10" textAnchor="middle" className="fill-[var(--text-faint)]" fontSize="7">
          Forside
        </text>
        {/* head */}
        <circle cx="35" cy="24" r="7" fill="var(--bg-elev-2)" {...stroke} />
        {/* shoulders */}
        <rect x="18" y="33" width="10" height="8" rx="3" fill={fill(shoulders)} {...stroke} />
        <rect x="42" y="33" width="10" height="8" rx="3" fill={fill(shoulders)} {...stroke} />
        {/* chest */}
        <rect x="26" y="34" width="18" height="13" rx="4" fill={fill(chest)} {...stroke} />
        {/* core */}
        <rect x="28" y="49" width="14" height="16" rx="3" fill={fill(core)} {...stroke} />
        {/* biceps */}
        <rect x="16" y="43" width="8" height="16" rx="3" fill={fill(biceps)} {...stroke} />
        <rect x="46" y="43" width="8" height="16" rx="3" fill={fill(biceps)} {...stroke} />
        {/* quads */}
        <rect x="26" y="67" width="8" height="24" rx="3" fill={fill(quads)} {...stroke} />
        <rect x="36" y="67" width="8" height="24" rx="3" fill={fill(quads)} {...stroke} />
        {/* lower legs */}
        <rect x="27" y="93" width="6" height="18" rx="2" fill="var(--bg-elev-2)" {...stroke} />
        <rect x="37" y="93" width="6" height="18" rx="2" fill="var(--bg-elev-2)" {...stroke} />
      </g>

      {/* ---- Back view ---- */}
      <g transform="translate(105,0)">
        <text x="35" y="10" textAnchor="middle" className="fill-[var(--text-faint)]" fontSize="7">
          Bagside
        </text>
        <circle cx="35" cy="24" r="7" fill="var(--bg-elev-2)" {...stroke} />
        <rect x="18" y="33" width="10" height="8" rx="3" fill={fill(shoulders)} {...stroke} />
        <rect x="42" y="33" width="10" height="8" rx="3" fill={fill(shoulders)} {...stroke} />
        {/* back */}
        <rect x="26" y="34" width="18" height="20" rx="4" fill={fill(back)} {...stroke} />
        {/* triceps */}
        <rect x="16" y="43" width="8" height="16" rx="3" fill={fill(triceps)} {...stroke} />
        <rect x="46" y="43" width="8" height="16" rx="3" fill={fill(triceps)} {...stroke} />
        {/* glutes */}
        <rect x="27" y="56" width="16" height="10" rx="4" fill={fill(glutes)} {...stroke} />
        {/* hamstrings */}
        <rect x="26" y="68" width="8" height="23" rx="3" fill={fill(hams)} {...stroke} />
        <rect x="36" y="68" width="8" height="23" rx="3" fill={fill(hams)} {...stroke} />
        <rect x="27" y="93" width="6" height="18" rx="2" fill="var(--bg-elev-2)" {...stroke} />
        <rect x="37" y="93" width="6" height="18" rx="2" fill="var(--bg-elev-2)" {...stroke} />
      </g>
    </svg>
  );
}

/**
 * Turn a list of exercises' primary muscles into 0..1 intensities, normalised
 * against the most-trained group so the map always has a clear peak.
 */
export function muscleIntensity(
  musclesPerExercise: string[][],
): Partial<Record<MuscleKey, number>> {
  const counts = new Map<string, number>();
  for (const muscles of musclesPerExercise) {
    for (const m of muscles) counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  const out: Partial<Record<MuscleKey, number>> = {};
  for (const [m, c] of counts) out[m as MuscleKey] = c / max;
  return out;
}
