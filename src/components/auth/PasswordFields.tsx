"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/app/I18nProvider";
import { checkPasswordStrength, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import type { TFunction } from "@/lib/i18n/core";

/**
 * Choose a password — used when setting the first one, changing an existing one
 * and choosing a new one from an emailed link.
 *
 * The three differ only in what has to be sent along, so they share the fields
 * rather than the sequence: the caller supplies the endpoint and whatever extra
 * body it needs. Validation runs here as well as on the server, so "too short"
 * arrives while typing rather than after a round trip.
 */

/** Turn a server-side rejection into something a person can act on. */
export function passwordErrorText(
  t: TFunction,
  error: string | undefined,
  problem?: string,
  retryAfterSeconds?: number,
): string {
  if (error === "weak") {
    if (problem === "too_common") return t("auth.passwordTooCommon");
    if (problem === "too_simple") return t("auth.passwordTooSimple");
    return t("auth.passwordTooShort", { min: MIN_PASSWORD_LENGTH });
  }
  if (error === "wrong_current") return t("auth.passwordWrong");
  if (error === "rate_limited") {
    return t("auth.passwordRateLimited", {
      minutes: Math.max(1, Math.ceil((retryAfterSeconds ?? 60) / 60)),
    });
  }
  if (error === "link_expired" || error === "no_user") return t("auth.linkExpired");
  return t("errors.generic");
}

export interface PasswordFieldsProps {
  /** Where to post. The body is `{ password, ...extra }`, plus currentPassword. */
  endpoint: string;
  /** Ask for the existing password first — a live session alone is not proof. */
  requireCurrent?: boolean;
  /** Extra body fields, e.g. the token from a reset link. */
  extra?: Record<string, unknown>;
  submitLabel: string;
  onDone: () => void;
}

export function PasswordFields({
  endpoint,
  requireCurrent = false,
  extra,
  submitLabel,
  onDone,
}: PasswordFieldsProps) {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only complain about a password once there is something to complain about;
  // "too short" on an empty field is noise, not help.
  const strength = password ? checkPasswordStrength(password) : { ok: true as const };
  const mismatch = repeat.length > 0 && repeat !== password;
  const ready = !!password && !mismatch && repeat.length > 0 && strength.ok;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          ...(requireCurrent ? { currentPassword: current } : {}),
          ...extra,
        }),
      });
      if (res.ok) {
        setCurrent("");
        setPassword("");
        setRepeat("");
        onDone();
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        problem?: string;
        retryAfterSeconds?: number;
      } | null;
      setError(
        passwordErrorText(t, data?.error, data?.problem, data?.retryAfterSeconds),
      );
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {requireCurrent && (
        <Input
          label={t("auth.currentPassword")}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      )}
      <Input
        label={t("auth.newPassword")}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint={t("auth.passwordTooShort", { min: MIN_PASSWORD_LENGTH })}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label={t("auth.repeatPassword")}
        name="repeatPassword"
        type="password"
        autoComplete="new-password"
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
      />
      {password && !strength.ok && (
        <p className="text-sm text-warning">
          {passwordErrorText(t, "weak", strength.problem)}
        </p>
      )}
      {mismatch && <p className="text-sm text-warning">{t("auth.passwordMismatch")}</p>}
      <Button type="submit" size="lg" fullWidth disabled={busy || !ready}>
        {busy ? t("common.saving") : submitLabel}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </form>
  );
}
