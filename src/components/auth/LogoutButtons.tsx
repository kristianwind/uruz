"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";

export function LogoutButtons() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout(all: boolean) {
    setBusy(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all }),
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => logout(false)} disabled={busy} className="text-left">
        <Card interactive className="py-3 font-medium text-danger">
          {t("me.logout")}
        </Card>
      </button>
      <button onClick={() => logout(true)} disabled={busy} className="text-left">
        <Card interactive className="py-3 text-sm text-muted">
          {t("me.logoutAll")}
        </Card>
      </button>
    </div>
  );
}
