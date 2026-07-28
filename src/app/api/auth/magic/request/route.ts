import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/repo/users";
import { createMagicToken } from "@/lib/db/repo/auth";
import { sendEmail, magicLinkEmail } from "@/lib/notify/email";

export const runtime = "nodejs";

/**
 * Request a magic sign-in link. Always responds ok (never leaks whether the
 * email is registered); a link is only actually sent for an active user.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = getUserByEmail(email);
  if (user && user.isActive) {
    const token = createMagicToken(email, "login");
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${base}/api/auth/magic/callback?token=${token}`;
    const mail = magicLinkEmail(link);
    await sendEmail({ to: email, ...mail });
  }
  return NextResponse.json({ ok: true });
}
