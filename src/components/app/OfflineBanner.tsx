"use client";

import { useOnline } from "@/lib/offline/useOnline";
import { CloudOffIcon } from "@/components/ui/icons";
import { useT } from "@/components/app/I18nProvider";

/** Slim banner shown only while the device is offline. */
export function OfflineBanner() {
  const t = useT();
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning"
    >
      <CloudOffIcon size={14} />
      {t("common.offline")} — {t("errors.offlineSaved")}
    </div>
  );
}
