import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyRegistration } from "@/lib/auth/webauthn";

export const runtime = "nodejs";

/** Finish passkey registration for the signed-in user. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.response) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const ok = await verifyRegistration(user.id, body.response);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
