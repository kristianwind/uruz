import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { PreferenceControls } from "@/components/app/PreferenceControls";
import { RotationLock } from "@/components/app/RotationLock";
import { ChevronRightIcon, CoffeeIcon, CogIcon } from "@/components/ui/icons";
import { LogoutButtons } from "@/components/auth/LogoutButtons";
import { PasswordSection } from "@/components/auth/PasswordSection";
import { PasskeySection } from "@/components/auth/PasskeySection";
import { hasPassword, listCredentialSummaries } from "@/lib/db/repo/auth";
import { DataSection } from "@/components/app/DataSection";
import { getContext } from "@/lib/auth/session";
import { rankForLevel } from "@/lib/domain/ranks";
import { persistThemePrefs, persistLocale, persistMediaPref } from "./actions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const ctx = await getContext();
  const t = await getT(ctx?.user.localePref);
  if (!ctx) {
    return (
      <div className="pt-10 text-center">
        <Link href="/welcome" className="text-accent underline">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }
  const { user } = ctx;
  const rank = rankForLevel(user.rankLevel, t.locale);

  return (
    <div>
      <PageHeader title={t("me.title")} />

      <div className="lg:block lg:columns-2 lg:gap-6 lg:[&>*]:mb-6 lg:[&>*]:break-inside-avoid">

      {/* Profile + rank */}
      <Card className="mb-6 flex items-center gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl font-bold"
          style={{ background: `${rank.color}22`, color: rank.color }}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <CardTitle className="truncate text-lg">{user.displayName}</CardTitle>
          <CardMuted>
            <span style={{ color: rank.color }}>{rank.name}</span>
            {user.role === "admin" && <span className="text-faint"> · {t("me.admin")}</span>}
          </CardMuted>
        </div>
      </Card>

      {/* Theme + display settings */}
      <section aria-labelledby="settings-h" className="mb-6">
        <h2 id="settings-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("me.settings")}
        </h2>
        <Card className="flex flex-col gap-3">
          <PreferenceControls
            initialMode={user.modePref}
            initialTheme={user.themePref}
            initialLocale={t.locale}
            initialMedia={user.mediaPref}
            onPersistTheme={persistThemePrefs}
            onPersistLocale={persistLocale}
            onPersistMedia={persistMediaPref}
          />
          <div className="border-t border-border pt-3">
            <RotationLock />
          </div>
        </Card>
      </section>

      {/* Links */}
      <nav className="flex flex-col gap-2">
        <Link href="/coach">
          <Card interactive className="flex items-center justify-between py-3">
            <span className="font-medium">ᛘ {t("coach.askTitle")}</span>
            <ChevronRightIcon className="text-muted" />
          </Card>
        </Link>
        <Link href="/library">
          <Card interactive className="flex items-center justify-between py-3">
            <span className="font-medium">{t("library.title")}</span>
            <ChevronRightIcon className="text-muted" />
          </Card>
        </Link>
        <Link href="/reminders">
          <Card interactive className="flex items-center justify-between py-3">
            <span className="font-medium">{t("reminders.title")}</span>
            <ChevronRightIcon className="text-muted" />
          </Card>
        </Link>
        <Link href="/install">
          <Card interactive className="flex items-center justify-between py-3">
            <span className="font-medium">{t("me.installApp")}</span>
            <ChevronRightIcon className="text-muted" />
          </Card>
        </Link>
        {user.role === "admin" && (
          <Link href="/admin">
            <Card interactive className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 font-medium">
                <CogIcon size={18} /> {t("me.admin")}
              </span>
              <ChevronRightIcon className="text-muted" />
            </Card>
          </Link>
        )}
      </nav>

      <section className="mt-6">
        <PasskeySection
          passkeys={listCredentialSummaries(user.id)}
          hasPassword={hasPassword(user.id)}
          email={user.email}
        />
      </section>

      <section className="mt-6">
        <PasswordSection hasPassword={hasPassword(user.id)} />
      </section>

      <section className="mt-6">
        <DataSection displayName={user.displayName} />
      </section>

      {/* Support. Asked for once, in the quietest place it can live — never a
          banner and never on first run, which would read as a trial version of
          something that has no paid tier. The link is markup, not their script:
          no third-party request on page load, and it works on a box with no
          outbound internet. */}
      <section aria-labelledby="support-h" className="mt-6">
        <h2 id="support-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">
          {t("me.support")}
        </h2>
        <Card className="flex flex-col items-start gap-3">
          <CardMuted>{t("me.supportBody")}</CardMuted>
          <a
            href="https://buymeacoffee.com/kristianwind"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text opacity-80 transition-opacity hover:opacity-100"
          >
            <CoffeeIcon size={16} /> {t("me.supportButton")} ↗
          </a>
        </Card>
      </section>

      <section className="mt-4">
        <LogoutButtons />
      </section>
    </div>
    </div>
  );
}
