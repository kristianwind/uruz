import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { logSet, getSession } from "@/lib/db/repo/sessions";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  exerciseId: z.string().min(1),
  setIndex: z.number().int().min(0),
  weight: z.number().min(0).max(1000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  seconds: z.number().int().min(0).max(86400).nullable().optional(),
  isWarmup: z.boolean().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
});

/**
 * Log a single set. Idempotent by the client-supplied set id so offline replays
 * are safe. Returns any personal records beaten so the UI can celebrate.
 */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // A user may only write sets into their own session.
  const session = getSession(parsed.data.sessionId);
  if (!session || session.userId !== ctx.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = logSet(ctx.user.id, parsed.data);
  return NextResponse.json({
    ok: true,
    set: result.set,
    records: result.records,
    duplicate: result.duplicate,
  });
}
