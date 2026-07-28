import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { updateSet, userOwnsSet } from "@/lib/db/repo/sessions";

export const runtime = "nodejs";

const Body = z.object({
  setId: z.string().min(1),
  weight: z.number().min(0).max(1000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  seconds: z.number().int().min(0).max(86400).nullable().optional(),
  isWarmup: z.boolean().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
});

/** Correct a previously logged set. */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { setId, ...patch } = parsed.data;
  if (!userOwnsSet(ctx.user.id, setId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const set = updateSet(setId, patch);
  return NextResponse.json({ ok: true, set });
}
