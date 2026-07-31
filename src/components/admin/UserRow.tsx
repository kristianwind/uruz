"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/app/I18nProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface AdminUserView {
  id: string;
  displayName: string;
  email: string;
  role: "admin" | "member" | "coach";
  isActive: boolean;
  rankName: string;
  rankColor: string;
  isSelf: boolean;
}

/** One member row with role, active-state and delete controls. */
export function UserRow({
  user,
  onSetActive,
  onSetRole,
  onDelete,
}: {
  user: AdminUserView;
  onSetActive: (userId: string, isActive: boolean) => Promise<void>;
  onSetRole: (userId: string, role: string) => Promise<void>;
  onDelete: (userId: string, confirmName: string) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch (err) {
        // The server refuses to strip the hall of its last admin; say why.
        setError(
          err instanceof Error && err.message.includes("LAST_ADMIN")
            ? t("admin.lastAdmin")
            : t("errors.generic"),
        );
      }
    });

  return (
    <li
      className={cn(
        "rounded-xl border border-border bg-elev p-3",
        !user.isActive && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold"
          style={{ background: `${user.rankColor}22`, color: user.rankColor }}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-text">
            {user.displayName}
            {user.isSelf && <span className="text-faint"> ({t("valhal.you")})</span>}
          </p>
          <p className="truncate text-xs text-faint">{user.email}</p>
        </div>
        <span className="shrink-0 text-xs" style={{ color: user.rankColor }}>
          {user.rankName}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
        <select
          value={user.role}
          disabled={pending}
          onChange={(e) => run(() => onSetRole(user.id, e.target.value))}
          aria-label={t("admin.role")}
          className="h-9 flex-1 rounded-lg border border-border bg-elev-2 px-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="admin">{t("admin.roleAdmin")}</option>
          <option value="member">{t("admin.roleMember")}</option>
          <option value="coach">{t("admin.roleCoach")}</option>
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => onSetActive(user.id, !user.isActive))}
          className={cn(
            "h-9 shrink-0 rounded-lg px-3 text-xs font-semibold",
            user.isActive ? "text-danger" : "text-success",
          )}
        >
          {user.isActive ? t("admin.deactivate") : t("admin.activate")}
        </button>
        {/* Your own account is deleted under Me, where sign-out is handled. */}
        {!user.isSelf && !deleting && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setDeleting(true);
            }}
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-danger"
          >
            {t("admin.deleteUser")}
          </button>
        )}
      </div>

      {deleting && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {/* Deleting a member erases their entire training history, so it
              takes typing the name — a mis-tap must not be able to do this. */}
          <p className="text-sm text-danger">{t("admin.deleteUserWarn")}</p>
          <Input
            label={t("admin.deleteUserType", { name: user.displayName })}
            name="confirmName"
            autoComplete="off"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={pending || confirmName !== user.displayName}
              onClick={() =>
                run(async () => {
                  await onDelete(user.id, confirmName);
                  setDeleting(false);
                  setConfirmName("");
                })
              }
            >
              {pending ? t("common.saving") : t("admin.deleteUser")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setDeleting(false);
                setConfirmName("");
                setError(null);
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </li>
  );
}
