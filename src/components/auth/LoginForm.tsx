"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginWithPasskey } from "@/lib/auth/passkey-client";
import { usePasskeySupported } from "./usePasskeySupported";
import { passwordErrorText } from "./PasswordFields";
import { useT } from "@/components/app/I18nProvider";

/**
 * Passkey-first sign-in, with a password and a magic link behind it.
 *
 * The order is the recommendation: a passkey is both the easiest and the
 * safest, so it stays the button you land on. The password is one tap away for
 * whoever has a device or browser that cannot do passkeys at all.
 */
export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const canPasskey = usePasskeySupported();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"passkey" | "password">("passkey");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"login" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function requireEmail(): boolean {
    if (email) return true;
    setError(t("auth.email"));
    return false;
  }

  async function passkey() {
    if (!requireEmail()) return;
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

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!requireEmail() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/train");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        retryAfterSeconds?: number;
      } | null;
      // Every kind of failure reads the same on purpose — the server does not
      // say whether the email exists, and neither should this.
      setError(
        data?.error === "rate_limited"
          ? passwordErrorText(t, "rate_limited", undefined, data.retryAfterSeconds)
          : t("auth.passwordWrong"),
      );
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function emailLink(purpose: "login" | "reset") {
    if (!requireEmail()) return;
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      setSent(purpose);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-xl bg-elev p-4 text-center text-sm text-muted">
        {sent === "reset" ? t("auth.resetSent") : t("auth.magicSent")}
      </p>
    );
  }

  return (
    <form onSubmit={withPassword} className="flex flex-col gap-4">
      <Input
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email webauthn"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {mode === "password" && (
        <Input
          label={t("auth.password")}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}

      {mode === "passkey" ? (
        <>
          {canPasskey && (
            <Button size="lg" fullWidth type="button" onClick={passkey} disabled={busy}>
              {t("auth.signInPasskey")}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            type="button"
            onClick={() => {
              setError(null);
              setMode("password");
            }}
            disabled={busy}
          >
            {t("auth.usePassword")}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            type="button"
            onClick={() => emailLink("login")}
            disabled={busy}
          >
            {t("auth.signInMagic")}
          </Button>
        </>
      ) : (
        <>
          <Button size="lg" fullWidth type="submit" disabled={busy || !password}>
            {t("auth.signInPassword")}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            type="button"
            onClick={() => emailLink("reset")}
            disabled={busy}
          >
            {t("auth.forgotPassword")}
          </Button>
          {canPasskey && (
            <Button
              variant="ghost"
              fullWidth
              type="button"
              onClick={() => {
                setError(null);
                setMode("passkey");
              }}
              disabled={busy}
            >
              {t("auth.usePasskey")}
            </Button>
          )}
        </>
      )}

      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </form>
  );
}
