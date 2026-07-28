"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/app/I18nProvider";

export function RevokeInviteButton({
  id,
  onRevoke,
}: {
  id: string;
  onRevoke: (id: string) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await onRevoke(id);
          router.refresh();
        })
      }
      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-danger"
    >
      {t("admin.revoke")}
    </button>
  );
}
