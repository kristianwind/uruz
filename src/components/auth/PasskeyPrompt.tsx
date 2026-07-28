"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { registerPasskey } from "@/lib/auth/passkey-client";
import { usePasskeySupported } from "./usePasskeySupported";
import { PasswordFields } from "./PasswordFields";
import { useT } from "@/components/app/I18nProvider";

/**
 * Shown right after a user is created + signed in. Offers to add a passkey
 * (Face ID / Touch ID), or a password for whoever cannot use one. Skippable —
 * the user is already signed in via session, and both can be added later.
 */
export function PasskeyPrompt({ redirectTo = "/train" }: { redirectTo?: string }) {
  const t = useT();
  const router = useRouter();
  const canPasskey = usePasskeySupported();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [choosingPassword, setChoosingPassword] = useState(false);

  async function add() {
    setBusy(true);
    setError(null);
    setDetail(null);
    try {
      const ok = await registerPasskey();
      if (ok) router.push(redirectTo);
      else setError(t("auth.passkeyFailed"));
    } catch (err) {
      // A passkey failure is nearly always configuration, not bad luck — and
      // the browser says exactly what is wrong. Passing that through turns an
      // unsolvable "something went wrong" into something actionable.
      const e = err as { name?: string; message?: string };
      if (e?.name === "NotAllowedError") {
        // Also fires on a plain cancel, so keep this one gentle.
        setError(t("auth.passkeyCancelled"));
      } else if (e?.name === "SecurityError") {
        setError(t("auth.passkeyDomainError"));
        setDetail(e.message ?? null);
      } else {
        setError(t("auth.passkeyFailed"));
        setDetail(e?.message ? `${e.name ?? "Error"}: ${e.message}` : null);
      }
    } finally {
      setBusy(false);
    }
  }

  if (choosingPassword) {
    // The account exists and is signed in by now, so this only adds a second
    // way back in later — nothing is lost by skipping it.
    return (
      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-muted">{t("me.passwordDesc")}</p>
        <PasswordFields
          endpoint="/api/auth/password/set"
          submitLabel={t("me.setPassword")}
          onDone={() => {
            router.push(redirectTo);
            router.refresh();
          }}
        />
        <Button variant="ghost" fullWidth onClick={() => setChoosingPassword(false)}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted">{t("auth.inviteDesc")}</p>
      {canPasskey ? (
        <Button size="lg" fullWidth onClick={add} disabled={busy}>
          {busy ? t("common.loading") : t("auth.createPasskey")}
        </Button>
      ) : (
        <p className="text-center text-xs text-faint">{t("auth.signInMagic")}</p>
      )}
      <Button
        variant="secondary"
        fullWidth
        onClick={() => setChoosingPassword(true)}
        disabled={busy}
      >
        {t("me.setPassword")}
      </Button>
      <Button variant="ghost" fullWidth onClick={() => router.push(redirectTo)} disabled={busy}>
        {t("common.continue")}
      </Button>

      {error && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
          <p className="text-sm text-warning">{error}</p>
          {detail && <p className="mt-1 break-words text-xs text-faint">{detail}</p>}
          <p className="mt-2 text-xs text-muted">{t("auth.passkeyCanSkip")}</p>
        </div>
      )}
    </div>
  );
}
