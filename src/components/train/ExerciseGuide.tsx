"use client";

import { useEffect, useState } from "react";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";
import type { MediaPref } from "@/lib/domain/types";

/**
 * What the exercise is, on the screen where you are doing it.
 *
 * Knowing the name of a movement is not the same as knowing the movement, and
 * looking it up meant leaving the workout, finding it in the library and
 * navigating back — with the rest timer running. So the drawing sits next to
 * the name, and the steps are one tap away without going anywhere.
 *
 * Collapsed by default: mid-workout the weight and the reps are what the thumb
 * is reaching for, and a wall of instructions between them and the top of the
 * screen would push the whole point of this app further down.
 */
export function ExerciseGuide({
  name,
  svgKey,
  imageUrl,
  steps,
  cues,
  mediaPref,
}: {
  name: string;
  svgKey: string | null;
  imageUrl: string | null;
  steps: string[];
  cues: string[];
  mediaPref: MediaPref;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const hasGuide = steps.length > 0 || cues.length > 0;

  // Open by default where it costs nothing: on a wide screen the instructions
  // fit beside the numbers instead of pushing them down. Decided after mount,
  // never during render, so the server and the first client paint agree.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setOpen(true);
  }, []);

  return (
    <div className="mt-3">
      <div className="flex items-start gap-3">
        <div className="h-20 w-24 shrink-0 rounded-lg border border-border bg-elev-2 p-1.5">
          <ExerciseMedia svgKey={svgKey} imageUrl={imageUrl} alt={name} pref={mediaPref} />
        </div>

        {hasGuide && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-between gap-2 rounded-lg px-3 text-left",
              "text-sm font-medium text-muted hover:bg-elev-2 hover:text-text",
            )}
          >
            {t("library.steps")}
            <ChevronRightIcon
              size={16}
              className={cn("shrink-0 transition-transform", open && "rotate-90")}
            />
          </button>
        )}
      </div>

      {open && hasGuide && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          {steps.length > 0 && (
            <ol className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-muted">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-elev-2 text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          {cues.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
                {t("library.cues")}
              </p>
              <ul className="flex flex-col gap-1">
                {cues.map((cue, i) => (
                  <li key={i} className="text-sm text-muted">
                    · {cue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
