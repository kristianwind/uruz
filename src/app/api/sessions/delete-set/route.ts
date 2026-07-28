import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { deleteSet, userOwnsSet } from "@/lib/db/repo/sessions";

export const runtime = "nodejs";

const Body = z.object({ setId: z.string().min(1) });

/** Remove a logged set. Idempotent: deleting an unknown set still succeeds. */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (userOwnsSet(ctx.user.id, parsed.data.setId)) deleteSet(parsed.data.setId);
  return NextResponse.json({ ok: true });
}
