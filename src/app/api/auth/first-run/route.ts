import { NextResponse } from "next/server";
import { z } from "zod";
import { isFirstRun, createHall, getAnyHall } from "@/lib/db/repo/halls";
import { createUser } from "@/lib/db/repo/users";
import { signIn } from "@/lib/auth/cookies";
import { writeAudit } from "@/lib/audit";
import { seed } from "@/lib/db/seed";

export const runtime = "nodejs";

const Body = z.object({
  displayName: z.string().trim().min(1).max(60),
  email: z.string().trim().email(),
  hallName: z.string().trim().min(1).max(80).optional(),
});

/**
 * Admin-first bootstrap (spec §2): the very first account becomes the hall's
 * admin. Guarded by isFirstRun() so it can only ever create the founding admin.
 */
export async function POST(req: Request) {
  if (!isFirstRun()) {
    return NextResponse.json({ error: "already_initialised" }, { status: 409 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { displayName, email, hallName } = parsed.data;

  const hall = getAnyHall() ?? createHall(hallName || "Kristians & Ibs hal");
  const admin = createUser({ hallId: hall.id, email, displayName, role: "admin" });
  // Populate the shared library so the app is usable from the first login.
  seed({ demo: false });
  await signIn(admin.id);
  writeAudit(hall.id, admin.id, "first_run_admin_created", admin.id);

  return NextResponse.json({ ok: true, userId: admin.id });
}
