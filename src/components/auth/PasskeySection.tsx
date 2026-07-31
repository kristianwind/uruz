"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/components/app/I18nProvider";
import { registerPasskey, reauthenticate } from "@/lib/auth/passkey-client";
import { usePasskeySupported } from "./usePasskeySupported";

export interface PasskeyView {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Your passkeys, under Me: what exists, when it was made, when it last let you
 * in — and how to get rid of one.
 *
 * Removing a key asks who you are again. A live session is not proof of
 * presence: an unlocked phone on a bench should not be a route to stripping
 * its owner's keys, which is the same reason changing a password requires the
 * old one. Where an account has no password, a fresh passkey assertion does
 * the same job.
 */
export function PasskeySection({
  passkeys,
  hasPassword,
  email,
}: {
  passkeys: PasskeyView[];
  hasPassword: boolean;
  email: string;
}) {
  const t = useT();
  const router = useRouter();
  const canPasskey = usePasskeySupported();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(t.locale === "da" ? "da-DK" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const ok = await registerPasskey(newName.trim() || undefined);
      if (!ok) return setError(t("auth.passkeyFailed"));
      setAdding(false);
      setNewName("");
      router.refresh();
    } catch {
      setError(t("auth.passkeyCancelled"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const attempt = (body: { currentPassword?: string; assertion?: unknown }) =>
        fetch(`/api/auth/passkey/credentials/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

      // First try with what we have — a freshly opened session needs no more
      // proof, so this succeeds without bothering anyone for a password or a
      // Face ID prompt. Only an older session falls through to re-auth below.
      let res = await attempt({ currentPassword: password || undefined });

      const errorOf = async (r: Response) =>
        ((await r.json().catch(() => null)) as { error?: string } | null)?.error;

      let code = res.ok ? undefined : await errorOf(res);

      if (code === "reauth_required" && !hasPassword) {
        // No password to type, session not fresh: prove it with any key still
        // on the account. This is the one path that needs the authenticator —
        // and if that key is exactly the broken one being removed, the way
        // out is a fresh sign-in (e-mail link), which the error text says.
        const assertion = await reauthenticate(email);
        if (!assertion) return setError(t("me.passkeyFreshLogin"));
        res = await attempt({ assertion });
        code = res.ok ? undefined : await errorOf(res);
      }

      if (res.ok) {
        setRemovingId(null);
        setPassword("");
        setNotice(t("me.passkeyRemoved"));
        router.refresh();
        return;
      }
      setError(
        code === "last_way_in"
          ? t("me.passkeyLastWayIn")
          : code === "not_found"
            ? t("me.passkeyGone")
            : code === "rate_limited"
              ? t("me.passkeyRateLimited")
              : code === "reauth_required"
                ? hasPassword
                  ? password
                    ? t("auth.passwordWrong")
                    : t("me.passkeyReauth")
                  : t("me.passkeyFreshLogin")
                : t("errors.generic"),
      );
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <CardTitle>{t("me.passkeys")}</CardTitle>
        <CardMuted>{t("me.passkeysDesc")}</CardMuted>
      </div>

      {notice && <p className="text-sm text-success">{notice}</p>}

      {passkeys.length === 0 ? (
        <p className="text-sm text-faint">{t("me.passkeysNone")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((k) => (
            <li key={k.id} className="rounded-xl border border-border bg-elev-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {k.name || t("me.passkeyUnnamed")}
                  </p>
                  <p className="text-xs text-faint">
                    {t("me.passkeyAdded", { date: fmtDate(k.createdAt) })}
                    {" · "}
                    {k.lastUsedAt
                      ? t("me.passkeyLastUsed", { date: fmtDate(k.lastUsedAt) })
                      : t("me.passkeyNeverUsed")}
                  </p>
                </div>
                {removingId !== k.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setRemovingId(k.id);
                    }}
                  >
                    {t("me.passkeyRemove")}
                  </Button>
                )}
              </div>

              {removingId === k.id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-sm text-muted">
                    {hasPassword ? t("me.passkeyReauth") : t("me.passkeyReauthKey")}
                  </p>
                  {hasPassword && (
                    <Input
                      label={t("auth.currentPassword")}
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => remove(k.id)}
                    >
                      {busy ? t("common.saving") : t("me.passkeyRemove")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setRemovingId(null);
                        setPassword("");
                        setError(null);
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canPasskey &&
        (adding ? (
          <div className="flex flex-col gap-2">
            <Input
              label={t("me.passkeyName")}
              name="passkeyName"
              hint={t("me.passkeyNameHint")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={add} disabled={busy}>
                {busy ? t("common.loading") : t("auth.createPasskey")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={busy}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNotice(null);
              setError(null);
              setAdding(true);
            }}
          >
            {t("me.passkeyAdd")}
          </Button>
        ))}

      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
