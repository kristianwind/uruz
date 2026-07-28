"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasskeyPrompt } from "./PasskeyPrompt";
import { useT } from "@/components/app/I18nProvider";

/** Accept an invitation, then offer passkey creation. */
export function InviteForm({ code, email }: { code: string; email: string }) {
  const t = useT();
  const suggested = email.split("@")[0] || "";
  const [displayName, setDisplayName] = useState(
    suggested.charAt(0).toUpperCase() + suggested.slice(1),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, displayName }),
      });
      if (res.ok) setAccepted(true);
      else setError(t("auth.inviteInvalid"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (accepted) return <PasskeyPrompt redirectTo="/train" />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label={t("auth.email")} value={email} disabled readOnly />
      <Input
        label={t("auth.displayName")}
        name="displayName"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <Button type="submit" size="lg" fullWidth disabled={busy || !displayName}>
        {busy ? t("common.saving") : t("auth.acceptInvite")}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </form>
  );
}
