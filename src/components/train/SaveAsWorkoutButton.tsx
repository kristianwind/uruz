"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/app/I18nProvider";

/**
 * Keep a free session as a workout, and go to it.
 *
 * Lands on the workout rather than starting it: this screen is being read after
 * the fact, not in the gym, and the app's rule everywhere else is that you see
 * what is in a workout before it begins.
 */
export function SaveAsWorkoutButton({
  sessionId,
  action,
}: {
  sessionId: string;
  action: (sessionId: string) => Promise<string>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        fullWidth
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setFailed(false);
            try {
              const workoutId = await action(sessionId);
              router.push(`/library/workout/${workoutId}?from=history`);
            } catch {
              // The session is untouched either way — say so rather than
              // leaving a button that looks like it did nothing.
              setFailed(true);
            }
          })
        }
      >
        {pending ? t("common.saving") : t("train.saveAsWorkout")}
      </Button>
      {failed && <p className="text-sm text-danger">{t("errors.generic")}</p>}
    </div>
  );
}
