import { getDb, fromBool, newId, nowIso, type Row } from "../sqlite";
import { mapReminder } from "../mappers";
import type { Reminder, ReminderChannel } from "@/lib/domain/types";

/**
 * Training-day reminders.
 *
 * Schedules are stored as a simple weekday + time rather than a full cron
 * expression: "man + tor kl. 16" is what the spec asks for, and a picker for
 * two weekdays is far kinder than teaching a user cron syntax. The
 * `schedule_cron` column keeps the standard 5-field shape so a real cron
 * backend can consume it unchanged.
 */

/** Build a cron expression from weekdays (0=Sunday) and a time. */
export function toCron(weekdays: number[], hour: number, minute = 0): string {
  const days = [...new Set(weekdays)].sort().join(",");
  return `${minute} ${hour} * * ${days || "*"}`;
}

export interface ParsedSchedule {
  weekdays: number[];
  hour: number;
  minute: number;
}

/** Parse the subset of cron this app writes. Returns null for anything else. */
export function parseCron(expr: string): ParsedSchedule | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, , , dow] = parts;
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const weekdays =
    dow === "*"
      ? [0, 1, 2, 3, 4, 5, 6]
      : dow
          .split(",")
          .map(Number)
          .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6);
  return { weekdays, hour: h, minute: m };
}

export function listReminders(userId: string): Reminder[] {
  const rows = getDb()
    .prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY kind")
    .all(userId) as Row[];
  return rows.map(mapReminder);
}

export function listEnabledReminders(): Reminder[] {
  const rows = getDb().prepare("SELECT * FROM reminders WHERE enabled = 1").all() as Row[];
  return rows.map(mapReminder);
}

export interface UpsertReminderInput {
  userId: string;
  kind: string;
  scheduleCron: string;
  channel?: ReminderChannel;
  enabled?: boolean;
}

/** One reminder per user+kind; saving again replaces the schedule. */
export function upsertReminder(input: UpsertReminderInput): Reminder {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM reminders WHERE user_id = ? AND kind = ?")
    .get(input.userId, input.kind) as Row | undefined;

  if (existing) {
    db.prepare(
      "UPDATE reminders SET schedule_cron = ?, channel = ?, enabled = ? WHERE id = ?",
    ).run(
      input.scheduleCron,
      input.channel ?? "push",
      fromBool(input.enabled ?? true),
      String(existing.id),
    );
    const row = db.prepare("SELECT * FROM reminders WHERE id = ?").get(String(existing.id)) as Row;
    return mapReminder(row);
  }

  const id = newId();
  db.prepare(
    `INSERT INTO reminders (id, user_id, kind, schedule_cron, channel, enabled)
     VALUES (?,?,?,?,?,?)`,
  ).run(
    id,
    input.userId,
    input.kind,
    input.scheduleCron,
    input.channel ?? "push",
    fromBool(input.enabled ?? true),
  );
  const row = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id) as Row;
  return mapReminder(row);
}

export function markReminderSent(id: string): void {
  getDb().prepare("UPDATE reminders SET last_sent_at = ? WHERE id = ?").run(nowIso(), id);
}

export function deleteReminder(id: string, userId: string): void {
  getDb().prepare("DELETE FROM reminders WHERE id = ? AND user_id = ?").run(id, userId);
}

/**
 * True when a reminder is due now: today is one of its weekdays, the time has
 * passed, and it hasn't already fired today.
 */
export function isDue(reminder: Reminder, now = new Date()): boolean {
  const schedule = parseCron(reminder.scheduleCron);
  if (!schedule) return false;
  if (!schedule.weekdays.includes(now.getDay())) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const minutesDue = schedule.hour * 60 + schedule.minute;
  if (minutesNow < minutesDue) return false;

  if (reminder.lastSentAt) {
    const last = new Date(reminder.lastSentAt);
    const sameDay =
      last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate();
    if (sameDay) return false;
  }
  return true;
}
