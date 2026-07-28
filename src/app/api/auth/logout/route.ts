import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/cookies";
import { deleteAllUserSessions } from "@/lib/db/repo/auth";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Log out this device, or all devices when body { all: true }. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.all) {
    const user = await getCurrentUser();
    if (user) deleteAllUserSessions(user.id);
  }
  await signOut();
  return NextResponse.json({ ok: true });
}
