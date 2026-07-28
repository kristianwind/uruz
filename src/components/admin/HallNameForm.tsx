"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/app/I18nProvider";

/**
 * Rename the hall.
 *
 * It gets its name during first run, when the person setting things up is
 * mostly trying to get in. Leaving that first guess permanent would make the
 * name of the place a typo nobody can fix.
 */
export function HallNameForm({
  initialName,
  onRename,
}: {
  initialName: string;
  onRename: (name: string) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);

  const changed = name.trim().length > 0 && name.trim() !== initialName;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!changed) return;
        const value = name.trim();
        startTransition(async () => {
          await onRename(value);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <Input
        label={t("auth.hallName")}
        name="hallName"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !changed}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        {saved && !changed && <span className="text-sm text-success">{t("common.done")}</span>}
      </div>
    </form>
  );
}
