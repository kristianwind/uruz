"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import { BoltIcon, PencilIcon } from "@/components/ui/icons";
import type { LoggedSet } from "./ActiveWorkout";

/**
 * One logged set. Tap to expand into inline correction fields (spec §6:
 * "Rediger bagefter"); PR sets are marked with a spark.
 */
export function SetRow({
  set,
  index,
  isTimed,
  onDelete,
  onEdit,
}: {
  set: LoggedSet;
  index: number;
  isTimed: boolean;
  onDelete: () => void;
  onEdit: (patch: { weight?: number | null; reps?: number | null; seconds?: number | null }) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const summary = isTimed
    ? `${set.seconds ?? 0} ${t("common.sec")}`
    : set.weight
      ? `${set.weight} ${t("common.kg")} × ${set.reps ?? 0}`
      : `${set.reps ?? 0} ${t("common.reps")}`;

  return (
    <li
      className={cn(
        "rounded-lg border px-3 py-2",
        set.isPr ? "border-success bg-success-soft/40" : "border-border bg-elev-2",
        set.isWarmup && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="tabnum w-6 text-sm text-faint">{index + 1}.</span>
          <span className="tabnum font-semibold text-text">{summary}</span>
          {set.isWarmup && <span className="text-xs text-warning">{t("train.warmup")}</span>}
        </span>
        <span className="flex items-center gap-2">
          {set.isPr && (
            <span className="flex items-center gap-1 text-xs font-semibold text-success">
              <BoltIcon size={14} /> {t("train.prNew")}
            </span>
          )}
          {/* A row you can tap has to look like one. Without this the edit and
              delete controls exist but are invisible, which is the same as not
              existing — the first person to use this in a gym could not correct
              a mis-logged set. */}
          <PencilIcon
            size={15}
            className={cn("shrink-0 transition-transform", open ? "text-accent" : "text-faint")}
          />
        </span>
      </button>

      {open && (
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          {isTimed ? (
            <label className="flex flex-1 items-center gap-2 text-xs text-muted">
              {t("common.sec")}
              <input
                type="text"
                inputMode="numeric"
                defaultValue={String(set.seconds ?? 0)}
                onBlur={(e) => onEdit({ seconds: Number(e.target.value) || 0 })}
                className="tabnum h-9 w-full rounded-lg border border-border bg-elev px-2 text-text"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-1 items-center gap-2 text-xs text-muted">
                {t("common.kg")}
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={String(set.weight ?? 0)}
                  onBlur={(e) => onEdit({ weight: Number(e.target.value.replace(",", ".")) || 0 })}
                  className="tabnum h-9 w-full rounded-lg border border-border bg-elev px-2 text-text"
                />
              </label>
              <label className="flex flex-1 items-center gap-2 text-xs text-muted">
                {t("common.reps")}
                <input
                  type="text"
                  inputMode="numeric"
                  defaultValue={String(set.reps ?? 0)}
                  onBlur={(e) => onEdit({ reps: Number(e.target.value) || 0 })}
                  className="tabnum h-9 w-full rounded-lg border border-border bg-elev px-2 text-text"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-danger"
          >
            {t("common.delete")}
          </button>
        </div>
      )}
    </li>
  );
}
