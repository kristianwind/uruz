"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardMuted } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";

/**
 * Invite a new member. The invitation link is always shown after creating it —
 * e-mail delivery can fail or land in spam, and the admin should never be stuck
 * waiting on it.
 */
export function AdminInviteForm({
  onInvite,
}: {
  onInvite: (input: { email: string; role: "admin" | "member" | "coach" }) => Promise<{
    code: string;
    link: string;
    emailed: boolean;
  }>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ link: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          const value = email.trim();
          startTransition(async () => {
            const res = await onInvite({ email: value, role: "member" });
            setResult(res);
            setEmail("");
            router.refresh();
          });
        }}
        className="flex gap-2"
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("admin.inviteEmail")}
          className="flex-1"
          required
        />
        <Button type="submit" disabled={pending || !email.trim()}>
          {pending ? t("common.saving") : t("admin.inviteSend")}
        </Button>
      </form>

      {result && (
        <div className="rounded-lg border border-success/40 bg-success-soft/40 p-3">
          <p className="text-sm font-medium text-success">{t("admin.inviteSent")}</p>
          <CardMuted className="mt-1 text-xs">{t("admin.inviteLinkHint")}</CardMuted>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(result.link);
              setCopied(true);
            }}
            className="mt-2 w-full break-all rounded-lg border border-border bg-elev px-2 py-1.5 text-left text-xs text-muted"
          >
            {result.link}
          </button>
          {copied && <p className="mt-1 text-xs text-success">{t("admin.copyInvite")} ✓</p>}
        </div>
      )}
    </div>
  );
}
