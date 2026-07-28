import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { getSetLog, userOwnsSet } from "@/lib/db/repo/sessions";

export const runtime = "nodejs";

const Body = z.object({ setId: z.string().min(1) });

/**
 * Ask whether a just-logged set beat a record. The detection itself happens
 * server-side inside logSet(); this only reports the flag so the client can
 * celebrate without duplicating the rules.
 */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (!userOwnsSet(ctx.user.id, parsed.data.setId)) {
    // Not synced yet (offline) or not ours — no celebration, not an error.
    return NextResponse.json({ isPr: false, pending: true });
  }
  const set = getSetLog(parsed.data.setId);
  return NextResponse.json({ isPr: !!set?.isPr });
}
