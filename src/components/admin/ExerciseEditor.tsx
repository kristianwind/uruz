"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import { useT } from "@/components/app/I18nProvider";

export interface EditableExercise {
  slug: string;
  nameDa: string;
  nameEn: string | null;
  imageUrl: string | null;
  svgKey: string | null;
}

/**
 * Edit one shared-library exercise. Photos are attached here by URL, which is
 * how the "illustration or photo" preference gets something to show — the
 * illustration remains the fallback for anything without a picture.
 */
export function ExerciseEditor({
  exercise,
  onSave,
}: {
  exercise: EditableExercise;
  onSave: (input: {
    slug: string;
    nameDa?: string;
    nameEn?: string | null;
    imageUrl?: string | null;
  }) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [nameDa, setNameDa] = useState(exercise.nameDa);
  const [nameEn, setNameEn] = useState(exercise.nameEn ?? "");
  const [imageUrl, setImageUrl] = useState(exercise.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="rounded-xl border border-border bg-elev p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="h-11 w-12 shrink-0 rounded-lg bg-elev-2 p-1">
          <ExerciseMedia
            svgKey={exercise.svgKey}
            imageUrl={exercise.imageUrl}
            alt={exercise.nameDa}
            pref={exercise.imageUrl ? "photo" : "illustration"}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-text">{exercise.nameDa}</span>
          <span className="block truncate text-xs text-faint">
            {exercise.imageUrl ? exercise.imageUrl : t("admin.noImage")}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <Input label="Navn (dansk)" value={nameDa} onChange={(e) => setNameDa(e.target.value)} />
          <Input label="Name (English)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          <Input
            label={t("admin.imageUrl")}
            type="url"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await onSave({
                    slug: exercise.slug,
                    nameDa: nameDa.trim(),
                    nameEn: nameEn.trim() || null,
                    imageUrl: imageUrl.trim() || null,
                  });
                  setOpen(false);
                  router.refresh();
                } catch {
                  setError(t("errors.generic"));
                }
              })
            }
          >
            {pending ? t("common.saving") : t("common.save")}
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </li>
  );
}
