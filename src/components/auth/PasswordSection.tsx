"use client";

import { useState } from "react";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordFields, passwordErrorText } from "./PasswordFields";
import { useT } from "@/components/app/I18nProvider";

/**
 * Set, change or remove one's own password, under Me.
 *
 * Collapsed by default: passkeys remain the recommended way in, and this is the
 * alternative for whoever cannot use one — not the headline.
 */
export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isSet, setIsSet] = useState(hasPassword);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remove: true, currentPassword: current }),
      });
      if (res.ok) {
        setIsSet(false);
        setRemoving(false);
        setOpen(false);
        setCurrent("");
        setNotice(t("me.passwordRemoved"));
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        retryAfterSeconds?: number;
      } | null;
      setError(passwordErrorText(t, data?.error, undefined, data?.retryAfterSeconds));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <CardTitle>{t("me.password")}</CardTitle>
        <CardMuted>{isSet ? t("me.passwordSet") : t("me.passwordNotSet")}</CardMuted>
      </div>
      <p className="text-xs text-faint">{t("me.passwordDesc")}</p>

      {notice && <p className="text-sm text-success">{notice}</p>}

      {!open && !removing && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setNotice(null);
              setOpen(true);
            }}
          >
            {isSet ? t("me.changePassword") : t("me.setPassword")}
          </Button>
          {isSet && (
            <Button
              variant="ghost"
              onClick={() => {
                setNotice(null);
                setError(null);
                setRemoving(true);
              }}
            >
              {t("me.removePassword")}
            </Button>
          )}
        </div>
      )}

      {open && (
        <>
          <PasswordFields
            endpoint="/api/auth/password/set"
            requireCurrent={isSet}
            submitLabel={t("common.save")}
            onDone={() => {
              setIsSet(true);
              setOpen(false);
              setNotice(t("me.passwordSaved"));
            }}
          />
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        </>
      )}

      {removing && (
        <div className="flex flex-col gap-3">
          <Input
            label={t("auth.currentPassword")}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={remove} disabled={busy || !current}>
              {busy ? t("common.saving") : t("me.removePassword")}
            </Button>
            <Button variant="ghost" onClick={() => setRemoving(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </Card>
  );
}
