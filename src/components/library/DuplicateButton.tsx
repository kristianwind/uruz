"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/app/I18nProvider";

/**
 * "Duplicate & adjust": copy a workout into the hall as an editable one and go
 * straight to the builder, which is the point of the copy (spec §5).
 */
export function DuplicateButton({
  workoutId,
  action,
}: {
  workoutId: string;
  action: (workoutId: string) => Promise<string>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      fullWidth
      disabled={pending}
      className="flex-1"
      onClick={() =>
        startTransition(async () => {
          const newId = await action(workoutId);
          router.push(`/library/builder/${newId}`);
        })
      }
    >
      {pending ? t("common.saving") : t("library.duplicateAdjust")}
    </Button>
  );
}
