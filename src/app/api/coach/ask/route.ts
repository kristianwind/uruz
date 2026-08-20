import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { askCoach } from "@/lib/coach/kvasir";

export const runtime = "nodejs";
// A local model can take a while to think; allow for it.
export const maxDuration = 120;

const Body = z.object({ question: z.string().trim().min(1).max(500) });

/** "Spørg Kvasir" — free-text coaching question. */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const reply = await askCoach(ctx.user.id, parsed.data.question);
  if (!reply) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  return NextResponse.json(reply);
}
