import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/repo/users";
import { createMagicToken } from "@/lib/db/repo/auth";
import { sendEmail, magicLinkEmail, passwordResetEmail } from "@/lib/notify/email";
import { getAppOrigin } from "@/lib/auth/origin";

export const runtime = "nodejs";

/**
 * Request a link by email — either to sign in, or to set a new password after
 * forgetting the old one. Both are the same one-time token; only where it
 * lands differs, so a link meant for one purpose cannot be spent on the other.
 *
 * Always responds ok (never leaks whether the email is registered); a link is
 * only actually sent for an active user.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const reset = body?.purpose === "reset";

  const user = getUserByEmail(email);
  if (user && user.isActive) {
    const token = createMagicToken(email, reset ? "reset" : "login");
    const base = await getAppOrigin();
    const link = reset
      ? `${base}/login/reset?token=${token}`
      : `${base}/api/auth/magic/callback?token=${token}`;
    const mail = reset ? passwordResetEmail(link) : magicLinkEmail(link);
    await sendEmail({ to: email, ...mail });
  }
  return NextResponse.json({ ok: true });
}
