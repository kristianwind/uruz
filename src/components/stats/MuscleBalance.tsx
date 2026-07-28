import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/utils";

export interface MuscleBar {
  muscle: string;
  label: string;
  volume: number;
}

/**
 * Volume per muscle group as horizontal bars — easier to read (and to label)
 * on a narrow phone than a radar or pie chart.
 */
export function MuscleBalance({ bars }: { bars: MuscleBar[] }) {
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => b.volume), 1);

  return (
    <ul className="flex flex-col gap-2">
      {bars.map((b) => (
        <li key={b.muscle} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-xs text-muted">{b.label}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-elev-2">
            <span
              className={cn("block h-full rounded-full bg-accent")}
              style={{ width: `${Math.max(3, (b.volume / max) * 100)}%` }}
            />
          </span>
          <span className="tabnum w-14 shrink-0 text-right text-[11px] text-faint">
            {fmtNum(Math.round(b.volume / 100) / 10, 1)}t
          </span>
        </li>
      ))}
    </ul>
  );
}
