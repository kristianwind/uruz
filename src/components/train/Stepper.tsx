"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon, MinusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { asTyped, typedValue } from "@/lib/decimalfield";

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
 *
 * **What you are typing is not the same as what has been entered.** The field
 * used to show `String(value)` and nothing else, so every keystroke went through
 * a number and came back. Type `85,` and it became `Number("85.")` — 85 — and the
 * field redrew as `85`: the separator was gone before the next digit could be
 * typed. You could not write 85,8 at all. A half-typed number is text, and it has
 * to stay text until the person is done with it.
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

  // What is in the field while somebody is typing in it. `null` means nobody is,
  // and the field shows the value it was given — which is what the +/- buttons
  // change, and what a new set prefills.
  const [typing, setTyping] = useState<string | null>(null);


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
    (direction: 1 | -1) => {
      // A button press ends the typing: from here the value is what counts, and a
      // half-written number left on screen would disagree with it.
      setTyping(null);
      onChange(round(clamp(valueRef.current + direction * step)));
    },
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
            value={typing ?? String(value)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const text = asTyped(e.target.value);
              setTyping(text);
              // "85." and "" are on the way to a number without being one yet:
              // they stay on screen, and nothing goes upwards until there is
              // something to report.
              const next = typedValue(text);
              if (next !== null) onChange(clamp(next));
            }}
            onBlur={() => setTyping(null)}
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
