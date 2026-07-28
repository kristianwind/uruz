"use client";

import { useEffect } from "react";
import { BoltIcon } from "@/components/ui/icons";
import { useT } from "@/components/app/I18nProvider";

/**
 * Small, quick celebration when a set beats a record (spec §6/§13).
 * Subtle by design — it must never block the next set.
 */
export function PRToast({
  exerciseName,
  onDone,
}: {
  exerciseName: string | null;
  onDone: () => void;
}) {
  const t = useT();
  useEffect(() => {
    if (!exerciseName) return;
    navigator.vibrate?.(40);
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [exerciseName, onDone]);

  if (!exerciseName) return null;

  return (
    <div
      role="status"
      className="animate-spark fixed inset-x-4 top-4 z-50 mx-auto max-w-sm rounded-xl border border-success bg-success-soft px-4 py-3 shadow-[var(--shadow)]"
    >
      <p className="flex items-center gap-2 font-semibold text-success">
        <BoltIcon size={18} />
        {t("train.prCongrats", { exercise: exerciseName })}
      </p>
    </div>
  );
}
