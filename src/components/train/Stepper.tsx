"use client";

import { PlusIcon, MinusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Big +/- stepper with a tappable numeric field.
 *
 * Sized for sweaty, one-handed use in a gym: 48px targets, `inputMode="decimal"`
 * so iOS shows the number pad, and `select-on-focus` so typing replaces the
 * prefilled value instead of appending to it.
 */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  suffix,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v * 100) / 100;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-center text-xs font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`${label} mindre`}
          onClick={() => onChange(round(clamp(value - step)))}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-elev-2 text-muted active:brightness-90"
        >
          <MinusIcon size={20} />
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            aria-label={label}
            value={String(value)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const raw = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
              const next = raw === "" ? 0 : Number(raw);
              if (!Number.isNaN(next)) onChange(clamp(next));
            }}
            className="tabnum h-12 w-full rounded-xl border border-border bg-elev-2 text-center text-xl font-bold text-text focus:border-accent focus:outline-none"
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`${label} mere`}
          onClick={() => onChange(round(clamp(value + step)))}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-elev-2 text-muted active:brightness-90"
        >
          <PlusIcon size={20} />
        </button>
      </div>
    </div>
  );
}
