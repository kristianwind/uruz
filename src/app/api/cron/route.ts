import { NextResponse } from "next/server";
import { runScheduledWork } from "@/lib/notify/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * External trigger for the scheduled work (reminders, nudges, badge sync and
 * the weekly analysis — see lib/notify/cron.ts).
 *
 * The app runs this itself every 15 minutes (instrumentation.ts), so nothing
 * needs to call this endpoint for reminders to work. It exists for hosts that
 * prefer an external scheduler — Vercel Cron, a Supabase scheduled function,
 * or plain `curl` — and for triggering a run by hand. Idempotent, so an
 * external caller on top of the built-in scheduler is harmless.
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

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runScheduledWork());
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runScheduledWork());
}
