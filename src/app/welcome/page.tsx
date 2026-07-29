import { localizedTitle } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { FirstRunForm } from "@/components/auth/FirstRunForm";
import { isFirstRun } from "@/lib/db/repo/halls";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("auth.firstRunTitle");

/** Admin-first bootstrap. Only reachable while the hall has no users. */
export default async function WelcomePage() {
  if (!isFirstRun()) redirect("/login");
  const t = await getT();
  return (
    <AuthShell title={t("auth.firstRunTitle")} subtitle={t("auth.firstRunDesc")}>
      <FirstRunForm />
    </AuthShell>
  );
}
