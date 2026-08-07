"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/app/I18nProvider";
import { ClockIcon } from "@/components/ui/icons";

/**
 * Time a held set — a plank, a hang, a wall sit.
 *
 * Typing the seconds afterwards means guessing them: nobody counts accurately
 * while shaking. So the set is timed while it happens, and the reading lands
 * straight in the field the set is logged from, still editable by hand for
 * the times you did count.
 *
 * Anchored on a timestamp rather than an accumulating counter, so a phone that
 * sleeps mid-plank still reports the real elapsed time.
 */
export function Stopwatch({
  value,
  onChange,
}: {
  /** Current seconds value, kept in sync with the manual field. */
  value: number;
  onChange: (seconds: number) => void;
}) {
  const t = useT();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Last whole second handed upwards, so the reading is pushed once per second
  // rather than five times.
  const lastPushed = useRef(-1);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      // Keep the field in step with the running clock. Without this the value
      // only arrived on Stop — and pressing "Log set" straight from a running
      // stopwatch, which is the habit every other exercise teaches, logged
      // whatever the field happened to say before the plank started.
      if (secs !== lastPushed.current) {
        lastPushed.current = secs;
        onChangeRef.current(Math.max(1, secs));
      }
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [startedAt]);

  const running = startedAt !== null;
  const shown = running ? elapsed : value;

  const stop = () => {
    if (startedAt === null) return;
    const total = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setStartedAt(null);
    setElapsed(0);
    lastPushed.current = -1;
    onChangeRef.current(total);
    // A short buzz confirms the reading was taken, for a phone on the floor.
    navigator.vibrate?.(60);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-elev-2 px-3 py-2">
      <ClockIcon size={16} className={running ? "text-accent" : "text-faint"} />
      <span
        className={`tabnum flex-1 text-2xl font-bold ${running ? "text-accent" : "text-text"}`}
        aria-live="off"
      >
        {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, "0")}
      </span>
      {running ? (
        <Button size="sm" variant="danger" onClick={stop}>
          {t("train.stopTiming")}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setElapsed(0);
            setStartedAt(Date.now());
          }}
        >
          {t("train.startTiming")}
        </Button>
      )}
    </div>
  );
}
