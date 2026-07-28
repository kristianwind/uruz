"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import { ClockIcon } from "@/components/ui/icons";

/**
 * Rest timer. Starts automatically when a set is logged and counts down; a
 * gentle vibration marks the end (spec §6). Adjustable per exercise via +/-30s.
 */
export function RestTimer({
  seconds,
  startedAt,
  onSkip,
  onAdjust,
}: {
  seconds: number;
  /** Epoch ms when the rest began; null means no rest running. */
  startedAt: number | null;
  onSkip: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  const t = useT();
  const [remaining, setRemaining] = useState(seconds);
  const buzzed = useRef(false);

  useEffect(() => {
    if (startedAt === null) {
      setRemaining(seconds);
      buzzed.current = false;
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left === 0 && !buzzed.current) {
        buzzed.current = true;
        // Gentle haptic when rest is over — ignored where unsupported (iOS).
        navigator.vibrate?.([120, 60, 120]);
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [startedAt, seconds]);

  if (startedAt === null) return null;

  const done = remaining === 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;

  return (
    <div
      role="timer"
      aria-live="off"
      className={cn(
        "sticky bottom-20 z-20 overflow-hidden rounded-xl border bg-elev p-3",
        done ? "border-success" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("flex items-center gap-2 text-sm font-medium", done ? "text-success" : "text-muted")}>
          <ClockIcon size={16} />
          {done ? t("common.done") : t("train.restTimer")}
        </span>
        <span className={cn("tabnum text-2xl font-bold", done ? "text-success" : "text-text")}>
          {mm}:{String(ss).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAdjust(-30)}
            aria-label="30 sekunder mindre"
            className="h-9 w-9 rounded-lg border border-border text-sm font-semibold text-muted"
          >
            −30
          </button>
          <button
            type="button"
            onClick={() => onAdjust(30)}
            aria-label="30 sekunder mere"
            className="h-9 w-9 rounded-lg border border-border text-sm font-semibold text-muted"
          >
            +30
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="h-9 rounded-lg bg-elev-2 px-3 text-sm font-semibold text-text"
          >
            {t("common.done")}
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-elev-2">
        <div
          className={cn("h-full transition-[width] duration-300", done ? "bg-success" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
