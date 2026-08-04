import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The scheduler runs every fifteen minutes. Anything it decides to send has to
 * be decided from stored state, because "have I already sent this?" cannot be
 * answered by a process that may have restarted since.
 *
 * This is the test the nudge path did not have: on 2026-08-04 a hall member who
 * had trained exactly seven days earlier received sixty-nine e-mails in a day —
 * one per tick. The gate read `days % 7 !== 0`, which looks like "once a week"
 * but is constant for a whole day, so it opened every run instead of closing
 * all but one.
 */

const dir = mkdtempSync(join(tmpdir(), "uruz-nudge-"));
process.env.URUZ_SQLITE_PATH = join(dir, "test.sqlite");
// No mail route configured: deliver() falls through to "none" and sends nothing.
delete process.env.SMTP_HOST;
delete process.env.RESEND_API_KEY;

const { getDb } = await import("@/lib/db/sqlite");
const { createHall } = await import("@/lib/db/repo/halls");
const { createUser } = await import("@/lib/db/repo/users");
const { startSession, finishSession } = await import("@/lib/db/repo/sessions");
const { listCoachMessages } = await import("@/lib/db/repo/coach");
const { runScheduledNotifications } = await import("@/lib/notify/dispatch");

describe("gentle nudges", () => {
  it("sends one nudge, not one per scheduler tick", async () => {
    const hall = createHall("Hallen");
    const user = createUser({
      hallId: hall.id,
      email: "medlem@example.dk",
      displayName: "Medlem",
      role: "member",
    });

    // Last completed session exactly seven days ago — the case that fired.
    const s = startSession(user.id, null);
    finishSession(s.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    getDb()
      .prepare("UPDATE sessions SET started_at = ?, ended_at = ? WHERE id = ?")
      .run(sevenDaysAgo, sevenDaysAgo, s.id);

    const ticks = 8; // two hours of a scheduler running every fifteen minutes
    let delivered = 0;
    for (let i = 0; i < ticks; i++) {
      const out = await runScheduledNotifications(new Date());
      delivered += out.filter((r) => r.userId === user.id && r.kind === "nudge").length;
    }

    expect(delivered).toBe(1);
    // And it left exactly one message behind, not one per run.
    const stored = listCoachMessages(user.id).filter((m) => m.kind === "ris");
    expect(stored).toHaveLength(1);
  });
});
