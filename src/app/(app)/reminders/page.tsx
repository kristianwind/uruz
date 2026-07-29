import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { ReminderSettings } from "@/components/notify/ReminderSettings";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { requireContext } from "@/lib/auth/session";
import { listReminders, parseCron } from "@/lib/db/repo/reminders";
import { isPushConfigured } from "@/lib/notify/push";
import { getT } from "@/lib/i18n/server";
import { saveReminderAction, setCoachToneAction } from "./actions";

export const dynamic = "force-dynamic";
export const generateMetadata = localizedTitle("reminders.title");

export default async function RemindersPage() {
  const ctx = await requireContext();
  const t = await getT(ctx.user.localePref);

  const existing = listReminders(ctx.user.id).find((r) => r.kind === "training_day");
  const schedule = existing ? parseCron(existing.scheduleCron) : null;

  return (
    <div className="lg:max-w-3xl">
      <Link href="/me" className="mb-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("nav.me")}
      </Link>
      <PageHeader title={t("reminders.title")} subtitle="Huginn & Muninn" />
      <ReminderSettings
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        pushConfigured={isPushConfigured()}
        initial={{
          // Default to Monday + Thursday at 16:00 — the pattern in the spec.
          weekdays: schedule?.weekdays ?? [1, 4],
          hour: schedule?.hour ?? 16,
          enabled: existing?.enabled ?? false,
          tone: ctx.user.coachTone,
        }}
        onSave={saveReminderAction}
        onToneChange={setCoachToneAction}
      />
    </div>
  );
}
