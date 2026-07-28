import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nyt kodeord" };

/**
 * Landing page for the "choose a new password" link.
 *
 * Deliberately reachable while signed out and without any check of its own —
 * the token is checked when the new password is submitted, and checking it
 * here as well would only spend it early.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getT();
  return (
    <AuthShell title={t("auth.resetTitle")}>
      <ResetPasswordForm token={token ?? ""} />
    </AuthShell>
  );
}
