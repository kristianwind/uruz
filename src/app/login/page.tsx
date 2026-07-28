import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { isFirstRun } from "@/lib/db/repo/halls";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log ind" };

export default async function LoginPage() {
  if (isFirstRun()) redirect("/welcome");
  const user = await getCurrentUser();
  if (user) redirect("/train");
  const t = await getT();
  return (
    <AuthShell title={t("auth.welcome")} subtitle={t("app.tagline")}>
      <LoginForm />
    </AuthShell>
  );
}
