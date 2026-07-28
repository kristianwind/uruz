import { NextResponse } from "next/server";
import { consumeMagicToken } from "@/lib/db/repo/auth";
import { getUserByEmail } from "@/lib/db/repo/users";
import { signIn } from "@/lib/auth/cookies";

export const runtime = "nodejs";

/** Consume a magic-link token, sign the user in, and redirect into the app. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  const mt = token ? consumeMagicToken(token) : null;
  if (!mt) {
    return NextResponse.redirect(`${base}/login?error=link_expired`);
  }
  const user = getUserByEmail(mt.email);
  if (!user || !user.isActive) {
    return NextResponse.redirect(`${base}/login?error=no_user`);
  }
  await signIn(user.id);
  return NextResponse.redirect(`${base}/train`);
}
