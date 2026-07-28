import { NextResponse } from "next/server";
import { verifyAuthentication } from "@/lib/auth/webauthn";
import { getUser } from "@/lib/db/repo/users";
import { signIn } from "@/lib/auth/cookies";

export const runtime = "nodejs";

/** Finish passkey login and issue a session. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !body?.response) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const userId = await verifyAuthentication(email, body.response);
  if (!userId) return NextResponse.json({ error: "failed" }, { status: 401 });

  const user = getUser(userId);
  if (!user || !user.isActive) return NextResponse.json({ error: "inactive" }, { status: 403 });

  await signIn(user.id);
  return NextResponse.json({ ok: true });
}
