import "server-only";
import { sendPushToUser, countSubscriptions } from "./push";
import { sendEmail } from "./email";
import { ravenMessage, shouldNudge, type RavenKind } from "./ravens";
import {
  listEnabledReminders,
  isDue,
  markReminderSent,
} from "@/lib/db/repo/reminders";
import { getUser, listHallUsers } from "@/lib/db/repo/users";
import { getAnyHall } from "@/lib/db/repo/halls";
import { loadUserData } from "@/lib/domain/gamification-service";
import { weekStreak, dayKey } from "@/lib/domain/stats";
import { addCoachMessage } from "@/lib/db/repo/coach";
import { getLocale } from "@/lib/i18n/server";
import type { User } from "@/lib/domain/types";

/**
 * Sending the ravens (spec §8).
 *
 * One dispatcher used by both the scheduled job and the "send me a test"
 * button. Push is preferred; e-mail is the fallback when the user has no
 * registered device, so a reminder is never silently lost.
 */

export interface DispatchResult {
  userId: string;
  kind: RavenKind;
  channel: "push" | "email" | "none";
  title: string;
  body: string;
}

async function deliver(
  user: User,
  kind: RavenKind,
  message: { title: string; body: string },
  url: string,
): Promise<DispatchResult> {
  // Record it in the app too, so the message exists even if delivery fails.
  addCoachMessage({
    userId: user.id,
    kind: kind === "praise" ? "ros" : kind === "nudge" ? "ris" : "reminder",
    body: message.body,
    dataJson: { raven: kind },
  });

  if (countSubscriptions(user.id) > 0) {
    const result = await sendPushToUser(user.id, { ...message, url, tag: `uruz-${kind}` });
    if (result.sent > 0) {
      return { userId: user.id, kind, channel: "push", ...message };
    }
  }

  // No device registered (or push not configured) — fall back to e-mail.
  if (user.email && !user.email.endsWith("@uruz.local")) {
    await sendEmail({
      to: user.email,
      subject: message.title,
      text: message.body,
      html: `<div style="font-family:sans-serif;max-width:480px">
        <h2 style="color:#e0a83e">${message.title}</h2>
        <p>${message.body}</p>
      </div>`,
    });
    return { userId: user.id, kind, channel: "email", ...message };
  }

  return { userId: user.id, kind, channel: "none", ...message };
}

/** Days since the user's last completed session, or null if they never trained. */
function daysSinceLastSession(userId: string, now = new Date()): number | null {
  const data = loadUserData(userId);
  if (data.length === 0) return null;
  const last = new Date(data[data.length - 1].session.startedAt);
  const a = new Date(dayKey(last));
  const b = new Date(dayKey(now));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Run every scheduled reminder that is due, plus gentle nudges for people who
 * have drifted away. Intended to be called by a cron job every 15–30 minutes.
 */
export async function runScheduledNotifications(now = new Date()): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  const hall = getAnyHall();

  // ---- Explicit reminders on the user's chosen training days ----
  for (const reminder of listEnabledReminders()) {
    if (!isDue(reminder, now)) continue;
    const user = getUser(reminder.userId);
    if (!user || !user.isActive) continue;

    // Already trained today? Then a reminder would be nagging, not helping.
    const days = daysSinceLastSession(user.id, now);
    if (days === 0) {
      markReminderSent(reminder.id);
      continue;
    }

    const locale = await getLocale(user.localePref);

    // If a hall-mate trained recently, use the friendly-rivalry line instead.
    let kind: RavenKind = "reminder";
    let rivalName: string | undefined;
    if (hall) {
      const mate = listHallUsers(hall.id).find((u) => {
        if (u.id === user.id || !u.isActive) return false;
        const d = daysSinceLastSession(u.id, now);
        return d !== null && d <= 1;
      });
      if (mate) {
        kind = "rivalry";
        rivalName = mate.displayName;
      }
    }

    const message = ravenMessage(kind, {
      displayName: user.displayName,
      tone: user.coachTone,
      locale,
      rivalName,
      seed: now.getDate() + user.id.charCodeAt(0),
    });

    results.push(await deliver(user, kind, message, "/train"));
    markReminderSent(reminder.id);
  }

  // ---- Gentle nudges after an absence ----
  if (hall) {
    for (const user of listHallUsers(hall.id)) {
      if (!user.isActive) continue;
      const days = daysSinceLastSession(user.id, now);
      if (days === null || !shouldNudge(days)) continue;
      // Only nudge once a week, and never on top of a reminder sent above.
      if (days % 7 !== 0) continue;
      if (results.some((r) => r.userId === user.id)) continue;

      const locale = await getLocale(user.localePref);
      const message = ravenMessage("nudge", {
        displayName: user.displayName,
        tone: user.coachTone,
        locale,
        daysSinceLast: days,
        seed: days,
      });
      results.push(await deliver(user, "nudge", message, "/train"));
    }
  }

  return results;
}

/** Praise right after a finished session. Called from the finish flow. */
export async function sendPraise(userId: string): Promise<DispatchResult | null> {
  const user = getUser(userId);
  if (!user || !user.isActive) return null;

  const streak = weekStreak(loadUserData(userId));
  const locale = await getLocale(user.localePref);
  const message = ravenMessage("praise", {
    displayName: user.displayName,
    tone: user.coachTone,
    locale,
    streakWeeks: streak.currentWeeks,
    seed: streak.currentWeeks + new Date().getDate(),
  });
  return deliver(user, "praise", message, "/stats");
}
