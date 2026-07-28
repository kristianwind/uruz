import { cn } from "@/lib/utils";
import type { AttendanceDay } from "@/lib/domain/stats";

/**
 * Calendar heatmap of attendance — one column per week, Monday at the top.
 *
 * Pure CSS grid rather than a charting library: it renders on the server, costs
 * no JavaScript, and stays crisp at any size.
 */
export function Heatmap({
  days,
  weekdayLabels,
}: {
  days: AttendanceDay[];
  weekdayLabels: string[];
}) {
  if (days.length === 0) return null;

  // Pad the start so the first column begins on a Monday.
  const firstDate = new Date(days[0].date);
  const leading = (firstDate.getDay() + 6) % 7;
  const cells: (AttendanceDay | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ];

  const maxVolume = Math.max(1, ...days.map((d) => d.volume));

  const intensity = (day: AttendanceDay | null) => {
    if (!day || day.sessions === 0) return 0;
    // Four visible steps: any session already counts, volume deepens it.
    const ratio = day.volume / maxVolume;
    if (ratio > 0.66) return 4;
    if (ratio > 0.33) return 3;
    if (ratio > 0) return 2;
    return 1;
  };

  const STEP_CLASS = [
    "bg-elev-2",
    "bg-accent/25",
    "bg-accent/45",
    "bg-accent/70",
    "bg-accent",
  ];

  return (
    <div className="flex gap-1.5">
      {/* Weekday labels (Mon/Wed/Fri only, to stay readable) */}
      <div className="grid grid-rows-7 gap-[3px] pt-[1px] text-[9px] leading-none text-faint">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="flex h-3 items-center">
            {i % 2 === 0 ? label : ""}
          </span>
        ))}
      </div>

      <div
        className="grid flex-1 grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto"
        role="img"
        aria-label="Fremmøde-kalender"
      >
        {cells.map((day, i) => (
          <span
            key={day?.date ?? `pad-${i}`}
            title={day ? `${day.date}: ${day.sessions}` : undefined}
            className={cn("h-3 w-3 rounded-[3px]", STEP_CLASS[intensity(day)], !day && "opacity-0")}
          />
        ))}
      </div>
    </div>
  );
}
