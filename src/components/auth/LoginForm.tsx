"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginWithPasskey, passkeySupported } from "@/lib/auth/passkey-client";
import { useT } from "@/components/app/I18nProvider";

/** Passkey-first sign-in with a magic-link fallback. */
export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function passkey() {
    if (!email) {
      setError(t("auth.email"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = await loginWithPasskey(email);
      if (ok) router.push("/train");
      else setError(t("errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function magic() {
    if (!email) {
      setError(t("auth.email"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMagicSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (magicSent) {
    return <p className="rounded-xl bg-elev p-4 text-center text-sm text-muted">{t("auth.magicSent")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email webauthn"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {passkeySupported() && (
        <Button size="lg" fullWidth onClick={passkey} disabled={busy}>
          {t("auth.signInPasskey")}
        </Button>
      )}
      <Button variant="secondary" size="lg" fullWidth onClick={magic} disabled={busy}>
        {t("auth.signInMagic")}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
