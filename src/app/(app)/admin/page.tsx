import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardMuted } from "@/components/ui/Card";
import { AdminInviteForm } from "@/components/admin/InviteForm";
import { HallNameForm } from "@/components/admin/HallNameForm";
import { UserRow, type AdminUserView } from "@/components/admin/UserRow";
import { AIStatus } from "@/components/admin/AIStatus";
import { RevokeInviteButton } from "@/components/admin/RevokeInviteButton";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listHallUsers } from "@/lib/db/repo/users";
import { listInvitations } from "@/lib/db/repo/invitations";
import { listAudit } from "@/lib/audit";
import { rankForLevel, rankLevelFromPoints } from "@/lib/domain/ranks";
import { rankPoints } from "@/lib/domain/gamification";
import { loadUserData } from "@/lib/domain/gamification-service";
import { getAIConfig, isAIConfigured } from "@/lib/ai/provider";
import { checkWebAuthnConfig } from "@/lib/auth/webauthn";
import { isPushConfigured } from "@/lib/notify/push";
import { emailProvider } from "@/lib/notify/email";
import { getT } from "@/lib/i18n/server";
import {
  deleteUserAction,
  inviteUserAction,
  renameHallAction,
  revokeInvitationAction,
  setUserActiveAction,
  setUserRoleAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("admin.title");

export default async function AdminPage() {
  const ctx = await requireContext();
  // Server-side gate: hiding the link in the UI is not access control.
  if (ctx.user.role !== "admin") redirect("/me");
  const t = await getT(ctx.user.localePref);

  const users: AdminUserView[] = listHallUsers(ctx.hall.id).map((u) => {
    const rank = rankForLevel(rankLevelFromPoints(rankPoints(loadUserData(u.id))), t.locale);
    return {
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      rankName: rank.name,
      rankColor: rank.color,
      isSelf: u.id === ctx.user.id,
    };
  });

  const invitations = listInvitations(ctx.hall.id);
  const audit = listAudit(ctx.hall.id, 25);
  const ai = getAIConfig();
  const webauthn = await checkWebAuthnConfig();

  const email = emailProvider();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/me" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
          <ChevronLeftIcon size={16} /> {t("nav.me")}
        </Link>
        <PageHeader title={t("admin.title")} subtitle={`${t("admin.hall")}: ${ctx.hall.name}`} />
      </div>

      {/* System status */}
      <section className="flex flex-col gap-2 md:grid md:grid-cols-2 md:items-start">
        <AIStatus provider={ai.provider} model={ai.model} configured={isAIConfigured()} />
        {/* Passkey config is invisible when wrong: the browser rejects it
            locally and the server never hears about it. So show it. */}
        <Card className="flex flex-col gap-1.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-text">{t("admin.webauthnStatus")}</span>
            <span
              className={
                webauthn.valid
                  ? "rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"
                  : "rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger"
              }
            >
              {webauthn.valid ? t("admin.webauthnOk") : "!"}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
            <dt className="text-faint">{t("admin.webauthnOrigin")}</dt>
            <dd className="truncate text-muted">{webauthn.origin}</dd>
            <dt className="text-faint">{t("admin.webauthnRpId")}</dt>
            <dd className="truncate text-muted">{webauthn.rpID}</dd>
          </dl>
          {!webauthn.valid && (
            <p className="text-xs text-danger">
              {webauthn.problem === "rp_id_mismatch"
                ? t("admin.webauthnMismatch")
                : webauthn.problem === "not_secure_context"
                  ? t("admin.webauthnInsecure")
                  : t("admin.webauthnBadUrl")}
            </p>
          )}
          {webauthn.valid && webauthn.problem === "rp_id_override_ignored" && (
            <p className="text-xs text-warning">{t("admin.webauthnOverridden")}</p>
          )}
          {/* The address works, but it came from the request. Worth saying: it
              silently follows whatever host the app is reached on. */}
          {webauthn.inferred && (
            <p className="text-xs text-faint">{t("admin.webauthnInferred")}</p>
          )}
        </Card>
        <Card className="flex items-center justify-between py-3">
          <span className="text-sm font-medium text-text">{t("admin.pushStatus")}</span>
          <span className={isPushConfigured() ? "text-xs text-success" : "text-xs text-faint"}>
            {isPushConfigured() ? t("admin.configured") : t("admin.notConfigured")}
          </span>
        </Card>
        <Card className="flex items-center justify-between py-3">
          <span className="text-sm font-medium text-text">{t("admin.emailStatus")}</span>
          {/* Name the route out, not just "configured": which one is sending
              is the first thing you need when mail is not arriving. */}
          <span className={email === "dev" ? "text-xs text-warning" : "text-xs text-success"}>
            {email === "smtp"
              ? t("admin.emailSmtp")
              : email === "resend"
                ? t("admin.emailResend")
                : t("admin.devMode")}
          </span>
        </Card>
      </section>

      <div className="flex flex-col gap-6 lg:block lg:columns-2 lg:gap-6 lg:[&>*]:mb-6 lg:[&>*]:break-inside-avoid">
      {/* The hall */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("admin.hall")}
        </h2>
        <Card>
          <HallNameForm initialName={ctx.hall.name} onRename={renameHallAction} />
        </Card>
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("admin.users")} ({users.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              onSetActive={setUserActiveAction}
              onSetRole={setUserRoleAction}
              onDelete={deleteUserAction}
            />
          ))}
        </ul>
      </section>

      {/* Invitations */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("admin.invitations")}
        </h2>
        <Card className="mb-2">
          <AdminInviteForm onInvite={inviteUserAction} />
        </Card>
        {invitations.length === 0 ? (
          <CardMuted>{t("admin.noInvitations")}</CardMuted>
        ) : (
          <ul className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-elev p-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{inv.email}</span>
                  <span className="block text-xs text-faint">
                    {inv.status === "pending"
                      ? t("admin.pending")
                      : inv.status === "accepted"
                        ? t("admin.accepted")
                        : t("admin.revoke")}
                    {" · "}
                    <span className="tabnum">{inv.code}</span>
                  </span>
                </span>
                {inv.status === "pending" && (
                  <RevokeInviteButton id={inv.id} onRevoke={revokeInvitationAction} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shared library */}
      <Link href="/admin/library">
        <Card interactive className="flex items-center justify-between py-3">
          <span className="font-medium">{t("admin.library")}</span>
          <ChevronRightIcon className="text-muted" />
        </Card>
      </Link>

      {/* Audit log */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("admin.auditLog")}
        </h2>
        {audit.length === 0 ? (
          <CardMuted>{t("admin.auditEmpty")}</CardMuted>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border bg-elev px-3 py-2">
                <p className="text-sm text-text">{t(`admin.actions.${entry.action}`)}</p>
                <p className="text-[11px] text-faint">
                  {new Date(entry.createdAt).toLocaleString(
                    t.locale === "en" ? "en-GB" : "da-DK",
                    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </div>
  );
}
