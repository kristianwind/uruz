import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/session";
import { analyzeWeek } from "@/lib/coach/mimir";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Generate this week's analysis on demand. */
export async function POST() {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const reply = await analyzeWeek(ctx.user.id);
  if (!reply) return NextResponse.json({ error: "no_data" }, { status: 404 });

  return NextResponse.json(reply);
}
