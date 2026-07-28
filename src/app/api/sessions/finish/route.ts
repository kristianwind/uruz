import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { finishSession, getSession } from "@/lib/db/repo/sessions";
import { syncGamification } from "@/lib/domain/gamification-service";
import { sendPraise } from "@/lib/notify/dispatch";

export const runtime = "nodejs";

const Body = z.object({
  sessionId: z.string().min(1),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  bodyweight: z.number().min(0).max(500).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

/** Close out a training session with the optional wrap-up details. */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { sessionId, ...rest } = parsed.data;
  const session = getSession(sessionId);
  if (!session || session.userId !== ctx.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Already finished — treat as success so offline replays are idempotent.
  if (session.endedAt) return NextResponse.json({ ok: true, session });

  const updated = finishSession(sessionId, rest);

  // Award badges and send praise for the session just completed. Neither may
  // delay the response the user is waiting on, and neither may fail the save.
  let earned: string[] = [];
  try {
    earned = syncGamification(ctx.user.id).newlyEarned.map((b) => b.slug);
  } catch (err) {
    console.error("gamification sync failed:", err);
  }
  void sendPraise(ctx.user.id).catch((err) => console.error("praise failed:", err));

  return NextResponse.json({ ok: true, session: updated, earnedBadges: earned });
}
