import "server-only";
import webpush from "web-push";
import { getDb, newId, nowIso, type Row } from "@/lib/db/sqlite";

/**
 * Web Push delivery (spec §8).
 *
 * Push is what lets Huginn & Muninn reach the user when the app is closed —
 * the whole point of a reminder. Without VAPID keys configured the app still
 * works; reminders simply fall back to e-mail.
 */

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function isPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure(): boolean {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@uruz.local",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

// ---- Subscription storage ------------------------------------------------

export function saveSubscription(userId: string, sub: PushSubscriptionRecord): void {
  getDb()
    .prepare(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh  = excluded.p256dh,
         auth    = excluded.auth`,
    )
    .run(newId(), userId, sub.endpoint, sub.p256dh, sub.auth, nowIso());
}

export function deleteSubscription(endpoint: string): void {
  getDb().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function listSubscriptions(userId: string): PushSubscriptionRecord[] {
  const rows = getDb()
    .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as Row[];
  return rows.map((r) => ({
    endpoint: String(r.endpoint),
    p256dh: String(r.p256dh),
    auth: String(r.auth),
  }));
}

export function countSubscriptions(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?")
    .get(userId) as Row;
  return Number(row.n);
}

// ---- Sending -------------------------------------------------------------

export interface PushPayload {
  title: string;
  body: string;
  /** Where to open when the notification is tapped. */
  url?: string;
  tag?: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  skipped: boolean;
}

/**
 * Send a notification to every device the user has registered.
 *
 * Subscriptions that the push service reports as gone (404/410) are deleted:
 * they belong to an uninstalled app or a cleared browser and would otherwise
 * fail forever.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  if (!configure()) return { sent: 0, failed: 0, skipped: true };

  const subs = listSubscriptions(userId);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) deleteSubscription(sub.endpoint);
      }
    }),
  );

  return { sent, failed, skipped: false };
}
