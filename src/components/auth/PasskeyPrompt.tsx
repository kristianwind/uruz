"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { registerPasskey, passkeySupported } from "@/lib/auth/passkey-client";
import { useT } from "@/components/app/I18nProvider";

/**
 * Shown right after a user is created + signed in. Offers to add a passkey
 * (Face ID / Touch ID). Skippable — the user is already signed in via session.
 */
export function PasskeyPrompt({ redirectTo = "/train" }: { redirectTo?: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const ok = await registerPasskey();
      if (ok) router.push(redirectTo);
      else setError(t("errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted">{t("auth.inviteDesc")}</p>
      {passkeySupported() ? (
        <Button size="lg" fullWidth onClick={add} disabled={busy}>
          {busy ? t("common.loading") : t("auth.createPasskey")}
        </Button>
      ) : (
        <p className="text-center text-xs text-faint">{t("auth.signInMagic")}</p>
      )}
      <Button variant="ghost" fullWidth onClick={() => router.push(redirectTo)} disabled={busy}>
        {t("common.continue")}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
