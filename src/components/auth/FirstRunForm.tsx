"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasskeyPrompt } from "./PasskeyPrompt";
import { useT } from "@/components/app/I18nProvider";

/** Admin-first bootstrap form: create the founding admin, then offer a passkey. */
export function FirstRunForm() {
  const t = useT();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  // Optional: left blank, the server names the hall something neutral. Asking
  // is what keeps it from being named after whoever happened to build the app.
  const [hallName, setHallName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/first-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, hallName: hallName.trim() || undefined }),
      });
      if (res.ok) setCreated(true);
      else setError(t("errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  if (created) return <PasskeyPrompt redirectTo="/train" />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label={t("auth.displayName")}
        name="displayName"
        autoComplete="name"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <Input
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label={t("auth.hallName")}
        name="hallName"
        hint={t("auth.hallNameHint")}
        value={hallName}
        onChange={(e) => setHallName(e.target.value)}
      />
      <Button type="submit" size="lg" fullWidth disabled={busy || !displayName || !email}>
        {busy ? t("common.saving") : t("auth.createAdmin")}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </form>
  );
}
