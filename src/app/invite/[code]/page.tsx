import { AuthShell } from "@/components/auth/AuthShell";
import { InviteForm } from "@/components/auth/InviteForm";
import { getInvitationByCode, isInvitationUsable } from "@/lib/db/repo/invitations";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitation" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const t = await getT();
  const invite = getInvitationByCode(code);
  const usable = invite && isInvitationUsable(invite);

  if (!invite || !usable) {
    return (
      <AuthShell title={t("app.name")} subtitle={t("auth.inviteInvalid")}>
        <a href="/login" className="text-center text-accent underline">
          {t("auth.signIn")}
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.inviteTitle")} subtitle={t("auth.inviteDesc")}>
      <InviteForm code={invite.code} email={invite.email} />
    </AuthShell>
  );
}
