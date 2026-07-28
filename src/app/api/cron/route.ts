import { NextResponse } from "next/server";
import { runScheduledNotifications } from "@/lib/notify/dispatch";
import { analyzeWeek } from "@/lib/coach/mimir";
import { syncGamification } from "@/lib/domain/gamification-service";
import { listHallUsers } from "@/lib/db/repo/users";
import { getAnyHall } from "@/lib/db/repo/halls";
import { latestCoachMessage } from "@/lib/db/repo/coach";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Scheduled work: reminders, nudges, badge sync and the weekly analysis.
 *
 * Designed to be called every 15–30 minutes by Vercel Cron, a Supabase
 * scheduled function, or plain `curl` from any scheduler. Everything it does is
 * idempotent, so running it more often than needed is harmless — a reminder
 * already sent today will not be sent again.
 *
 * Protected by CRON_SECRET. Without that variable set the endpoint refuses to
 * run rather than defaulting to open, because it sends messages to real people.
 */

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const url = new URL(req.url);
  return bearer === secret || url.searchParams.get("secret") === secret;
}

async function run() {
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

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}
