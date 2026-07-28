import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db/sqlite";
import { countAdmins } from "@/lib/db/repo/users";
import { signOut } from "@/lib/auth/cookies";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Typing the display name is a deliberate speed bump: this is irreversible.
const Body = z.object({ confirm: z.string() });

/**
 * Delete the signed-in user's own training data and account (spec §10, GDPR).
 *
 * Everything hangs off the user row with ON DELETE CASCADE, so removing it
 * takes sessions, sets, records, badges, coach messages, constraints,
 * reminders and push subscriptions with it.
 */
export async function POST(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirm !== ctx.user.displayName) {
    return NextResponse.json({ error: "confirm_mismatch" }, { status: 400 });
  }

  // The hall must keep at least one administrator.
  if (ctx.user.role === "admin" && countAdmins(ctx.hall.id) <= 1) {
    return NextResponse.json({ error: "last_admin" }, { status: 409 });
  }

  writeAudit(ctx.hall.id, ctx.user.id, "user_deleted_self", ctx.user.id);
  getDb().prepare("DELETE FROM users WHERE id = ?").run(ctx.user.id);
  await signOut();

  return NextResponse.json({ ok: true });
}
