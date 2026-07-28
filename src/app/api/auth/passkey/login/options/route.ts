import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/repo/users";
import { authenticationOptions } from "@/lib/auth/webauthn";

export const runtime = "nodejs";

/**
 * Begin passkey login. The email only narrows the credential list; an unknown
 * email still returns valid options (empty allow-list) so account existence
 * isn't leaked.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const user = getUserByEmail(email);
  const options = await authenticationOptions(email, user?.id ?? null);
  return NextResponse.json(options);
}
