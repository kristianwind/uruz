"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardMuted } from "@/components/ui/Card";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";
import {
  pushSupport,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSupport,
} from "@/lib/notify/push-client";
import type { CoachTone } from "@/lib/domain/types";

/** Monday-first, matching how Danes read a week. */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
/** Index in DAY_KEYS -> JS getDay() value (Sunday = 0). */
const DAY_TO_JS = [1, 2, 3, 4, 5, 6, 0];

export function ReminderSettings({
  vapidPublicKey,
  pushConfigured,
  initial,
  onSave,
  onToneChange,
}: {
  vapidPublicKey: string;
  pushConfigured: boolean;
  initial: { weekdays: number[]; hour: number; enabled: boolean; tone: CoachTone };
  onSave: (input: { weekdays: number[]; hour: number; enabled: boolean }) => Promise<void>;
  onToneChange: (tone: CoachTone) => Promise<void>;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [weekdays, setWeekdays] = useState<number[]>(initial.weekdays);
  const [hour, setHour] = useState(initial.hour);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [tone, setTone] = useState<CoachTone>(initial.tone);

  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setSupport(pushSupport());
    void isSubscribed().then(setSubscribed);
  }, []);

  const toggleDay = (jsDay: number) =>
    setWeekdays((prev) =>
      prev.includes(jsDay) ? prev.filter((d) => d !== jsDay) : [...prev, jsDay].sort(),
    );

  const save = () =>
    startTransition(async () => {
      await onSave({ weekdays, hour, enabled });
      setNotice(t("reminders.saved"));
      router.refresh();
    });

  async function togglePush() {
    setBusy(true);
    setNotice(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const ok = await subscribeToPush(vapidPublicKey);
        setSubscribed(ok);
        if (!ok) setNotice(t("reminders.pushBlocked"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Device notifications */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text">{t("reminders.pushStatus")}</h2>
            <CardMuted>{subscribed ? t("reminders.pushOn") : t("reminders.pushOff")}</CardMuted>
          </div>
          {support === "ready" && pushConfigured && (
            <Button size="sm" variant={subscribed ? "secondary" : "primary"} onClick={togglePush} disabled={busy}>
              {subscribed ? t("reminders.pushDisable") : t("reminders.pushEnable")}
            </Button>
          )}
        </div>

        {!pushConfigured && <CardMuted className="text-warning">{t("reminders.pushNotConfigured")}</CardMuted>}
        {pushConfigured && support === "needs-install" && (
          <CardMuted className="text-warning">{t("reminders.pushUnsupported")}</CardMuted>
        )}
        {pushConfigured && support === "blocked" && (
          <CardMuted className="text-warning">{t("reminders.pushBlocked")}</CardMuted>
        )}

        {subscribed && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await fetch("/api/push/test", { method: "POST" });
              setNotice(t("reminders.testSent"));
              setBusy(false);
            }}
          >
            {t("reminders.sendTest")}
          </Button>
        )}
        <CardMuted className="text-xs">{t("reminders.emailFallback")}</CardMuted>
      </Card>

      {/* Schedule */}
      <Card className="flex flex-col gap-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-text">{t("reminders.enableReminders")}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </label>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
            {t("reminders.trainingDays")}
          </p>
          <div className="flex gap-1">
            {DAY_KEYS.map((key, i) => {
              const jsDay = DAY_TO_JS[i];
              const on = weekdays.includes(jsDay);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(jsDay)}
                  className={cn(
                    "h-11 flex-1 rounded-lg border text-xs font-semibold transition-colors",
                    on
                      ? "border-accent bg-accent text-on-accent"
                      : "border-border bg-elev-2 text-muted",
                  )}
                >
                  {t(`reminders.days.${key}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="reminder-hour" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-faint">
            {t("reminders.time")}
          </label>
          <select
            id="reminder-hour"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-border bg-elev-2 px-3 text-base text-text focus:border-accent focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <Button onClick={save} disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </Button>
      </Card>

      {/* Tone */}
      <Card>
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="text-sm font-medium text-text">{t("reminders.tone")}</span>
          <div className="flex rounded-lg border border-border bg-elev-2 p-0.5">
            {(["soft", "hard"] as CoachTone[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={tone === v}
                onClick={() =>
                  startTransition(async () => {
                    setTone(v);
                    await onToneChange(v);
                    router.refresh();
                  })
                }
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tone === v ? "bg-accent text-on-accent" : "text-muted hover:text-text",
                )}
              >
                {v === "soft" ? t("me.toneSoft") : t("me.toneHard")}
              </button>
            ))}
          </div>
        </div>
        <CardMuted className="text-xs">{t("reminders.toneHint")}</CardMuted>
      </Card>

      {notice && <p className="text-center text-sm text-success">{notice}</p>}
    </div>
  );
}
