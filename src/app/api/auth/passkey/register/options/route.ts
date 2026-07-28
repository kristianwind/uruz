import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { registrationOptions } from "@/lib/auth/webauthn";

export const runtime = "nodejs";

/** Begin passkey registration for the signed-in user. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const options = await registrationOptions(user.id, user.email);
  return NextResponse.json(options);
}
