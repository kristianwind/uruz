import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/session";
import { sendPushToUser } from "@/lib/notify/push";
import { ravenMessage } from "@/lib/notify/ravens";
import { getLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

/**
 * Send a test notification to the signed-in user's own devices, so they can
 * confirm reminders actually arrive before relying on them.
 */
export async function POST() {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const locale = await getLocale(ctx.user.localePref);
  const message = ravenMessage("reminder", {
    displayName: ctx.user.displayName,
    tone: ctx.user.coachTone,
    locale,
    seed: Date.now(),
  });

  const result = await sendPushToUser(ctx.user.id, {
    ...message,
    url: "/train",
    tag: "uruz-test",
  });
  return NextResponse.json(result);
}
