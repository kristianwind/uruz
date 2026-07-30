import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { deleteSessionOwned } from "@/lib/db/repo/sessions";

export const runtime = "nodejs";

const Body = z.object({ sessionId: z.string().min(1) });

/**
 * Delete a whole training session.
 *
 * The sets go with it — `set_logs.session_id` cascades. Personal records point
 * at the session with `ON DELETE SET NULL`, so a record survives the deletion
 * of the workout it was set in; the number was still lifted. That is the right
 * way round: deleting a mis-logged session should not quietly revoke a rank.
 */
export async function POST(req: Request) {
  // getContext, not requireContext: the latter throws, and a thrown error out
  // of a route handler becomes a 500. An unauthenticated caller deserves a 401
  // — and every other route under /api/sessions already answers that way.
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (!deleteSessionOwned(parsed.data.sessionId, ctx.user.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
