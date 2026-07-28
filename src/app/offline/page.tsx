import { CloudOffIcon } from "@/components/ui/icons";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Offline" };

export default async function OfflinePage() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <CloudOffIcon size={48} className="text-warning" />
      <h1 className="text-xl font-bold">{t("common.offline")}</h1>
      <p className="text-muted">{t("errors.offlineSaved")}</p>
    </main>
  );
}
