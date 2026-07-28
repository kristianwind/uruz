"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordFields } from "./PasswordFields";
import { useT } from "@/components/app/I18nProvider";

/**
 * Choose a new password from an emailed link.
 *
 * The link is the proof, so no current password is asked for — but it is spent
 * on submit, which is why an expired or reused one has to say so plainly
 * rather than leaving the person staring at a form that will never work.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-danger">{t("auth.linkExpired")}</p>
        <Button variant="secondary" fullWidth onClick={() => router.push("/login")}>
          {t("auth.signIn")}
        </Button>
      </div>
    );
  }

  if (done) {
    // The reset signs the user in, so there is nowhere to go but forward.
    return (
      <div className="flex flex-col gap-3">
        <p className="text-center text-sm text-success">{t("me.passwordSaved")}</p>
        <Button
          size="lg"
          fullWidth
          onClick={() => {
            router.push("/train");
            router.refresh();
          }}
        >
          {t("common.continue")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-muted">{t("auth.resetDesc")}</p>
      <PasswordFields
        endpoint="/api/auth/password/reset"
        extra={{ token }}
        submitLabel={t("auth.resetTitle")}
        onDone={() => setDone(true)}
      />
    </div>
  );
}
