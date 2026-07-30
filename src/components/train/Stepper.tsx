"use client";

import { useCallback, useEffect, useRef } from "react";
import { PlusIcon, MinusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Big +/- stepper with a tappable numeric field.
 *
 * Sized for sweaty, one-handed use in a gym: 48px targets, `inputMode="decimal"`
 * so iOS shows the number pad, and `select-on-focus` so typing replaces the
 * prefilled value instead of appending to it.
 *
 * **A tap moves half a kilo.** The step used to be 2.5 — one plate — which
 * cannot express what the machines in a real gym are actually set to: they land
 * on halves, and on stacks whose increments are nothing like 2.5. A number you
 * cannot enter is a number that gets logged wrong.
 *
 * Half-kilo steps would be tedious on their own, so **holding a button repeats
 * it, faster the longer you hold**. Twenty to sixty is one long press, and the
 * field itself can still be tapped and typed into for a jump.
 */

/** How long before a held button starts repeating, and how fast it then goes. */
const HOLD_DELAY_MS = 400;
const REPEAT_MS = 90;
/** Past this, the repeat speeds up — a long press means a big jump. */
const ACCELERATE_AFTER_MS = 1200;
const FAST_REPEAT_MS = 40;

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
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);
  const round = (v: number) => Math.round(v * 100) / 100;

  // A held button reads the latest value from a ref. An interval started once
  // would otherwise keep adding to whatever the value was when it began.
  const valueRef = useRef(value);
  valueRef.current = value;
  const timers = useRef<{
    start?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});

  const stop = useCallback(() => {
    clearTimeout(timers.current.start);
    clearInterval(timers.current.repeat);
    timers.current = {};
  }, []);

  // A component that disappears mid-press must not leave a timer running.
  useEffect(() => stop, [stop]);

  const nudge = useCallback(
    (direction: 1 | -1) => onChange(round(clamp(valueRef.current + direction * step))),
    [onChange, clamp, step],
  );

  const startHolding = useCallback(
    (direction: 1 | -1) => {
      nudge(direction);
      const heldSince = Date.now();
      timers.current.start = setTimeout(() => {
        let interval = REPEAT_MS;
        const tick = () => {
          nudge(direction);
          if (Date.now() - heldSince > ACCELERATE_AFTER_MS && interval !== FAST_REPEAT_MS) {
            interval = FAST_REPEAT_MS;
            clearInterval(timers.current.repeat);
            timers.current.repeat = setInterval(tick, interval);
          }
        };
        timers.current.repeat = setInterval(tick, interval);
      }, HOLD_DELAY_MS);
    },
    [nudge, stop],
  );

  const holdProps = (direction: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      // Keep receiving events if the thumb slides off the button mid-hold.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      startHolding(direction);
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    // A long press must not also raise iOS's callout menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-center text-xs font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`${label} −${step}`}
          {...holdProps(-1)}
          className="grid h-12 w-12 shrink-0 touch-none select-none place-items-center rounded-xl border border-border bg-elev-2 text-muted active:brightness-90"
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
            className="tabnum h-12 w-full rounded-xl border border-border bg-elev-2 text-center text-lg font-bold text-text focus:border-accent focus:outline-none sm:text-xl"
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`${label} +${step}`}
          {...holdProps(1)}
          className="grid h-12 w-12 shrink-0 touch-none select-none place-items-center rounded-xl border border-border bg-elev-2 text-muted active:brightness-90"
        >
          <PlusIcon size={20} />
        </button>
      </div>
    </div>
  );
}
