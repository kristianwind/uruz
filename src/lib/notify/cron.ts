import "server-only";
import { runScheduledNotifications } from "./dispatch";
import { analyzeWeek } from "@/lib/coach/mimir";
import { syncGamification } from "@/lib/domain/gamification-service";
import { listHallUsers } from "@/lib/db/repo/users";
import { getAnyHall } from "@/lib/db/repo/halls";
import { latestCoachMessage } from "@/lib/db/repo/coach";

/**
 * The scheduled work itself: reminders, nudges, badge sync and the weekly
 * analysis. Shared between the built-in scheduler (instrumentation.ts) and the
 * external /api/cron endpoint, so an installation works out of the box and a
 * host that prefers its own scheduler can still drive it.
 *
 * Everything here is idempotent — a reminder already sent today will not be
 * sent again, and the weekly analysis checks the last one actually stored.
 */
export async function runScheduledWork(): Promise<{
  notifications: unknown[];
  analyses: number;
}> {
  const notifications = await runScheduledNotifications();

  const hall = getAnyHall();
  let analyses = 0;
  if (hall) {
    for (const user of listHallUsers(hall.id)) {
      if (!user.isActive) continue;
      syncGamification(user.id);

      // One weekly analysis per user per week — checked against the last one
      // actually stored, so a restarted scheduler can't spam.
      const last = latestCoachMessage(user.id, "opsummering");
      const weekOld =
        !last || Date.now() - new Date(last.createdAt).getTime() > 7 * 86_400_000;
      if (weekOld) {
        await analyzeWeek(user.id);
        analyses++;
      }
    }
  }

  return { notifications, analyses };
}
