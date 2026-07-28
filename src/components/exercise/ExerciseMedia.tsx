"use client";

import { useState } from "react";
import { ExerciseIllustration } from "./Illustration";
import { cn } from "@/lib/utils";
import type { MediaPref } from "@/lib/domain/types";

/**
 * Shows an exercise as either a photograph or the stick-figure illustration,
 * honouring the user's preference (spec addition: "illustration eller billeder").
 *
 * The illustration is always the safe fallback: it needs no network, works
 * offline, and exists for every exercise. A photo is used only when one is
 * configured AND the user prefers photos; a broken image silently falls back.
 */
export function ExerciseMedia({
  svgKey,
  imageUrl,
  alt,
  pref = "illustration",
  className,
}: {
  svgKey: string | null;
  imageUrl: string | null;
  alt: string;
  pref?: MediaPref;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const usePhoto = pref === "photo" && !!imageUrl && !failed;

  if (usePhoto) {
    return (
      // A plain <img>: photos may come from arbitrary admin-provided URLs or
      // Supabase Storage, which next/image would need explicit config for.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl!}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("h-full w-full rounded-lg object-cover", className)}
      />
    );
  }

  return <ExerciseIllustration svgKey={svgKey} className={cn("h-full w-full", className)} />;
}
