import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail } from "@/lib/db/repo/users";
import { consumeMagicToken, setPasswordHash, deleteAllUserSessions } from "@/lib/db/repo/auth";
import { hashPassword, checkPasswordStrength } from "@/lib/auth/password";
import { signIn } from "@/lib/auth/cookies";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().trim().min(8),
  password: z.string().max(1024),
});

/**
 * Choose a new password from an emailed link — the way back in for someone who
 * has forgotten theirs and has no passkey.
 *
 * The token stands in for the old password, so it has to be spent carefully:
 * it is single-use, expires in half an hour, and only counts if it was issued
 * for this purpose. Proof arrives by email, so the strength check runs before
 * the token is spent — a rejected password should not cost the user the link.
 *
 * Every existing session is ended. Whoever asks for a new password may well be
 * doing so because someone else has access.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const strength = checkPasswordStrength(parsed.data.password);
  if (!strength.ok) {
    return NextResponse.json({ error: "weak", problem: strength.problem }, { status: 400 });
  }

  const mt = consumeMagicToken(parsed.data.token, "reset");
  if (!mt) return NextResponse.json({ error: "link_expired" }, { status: 400 });

  const user = getUserByEmail(mt.email);
  if (!user || !user.isActive) return NextResponse.json({ error: "no_user" }, { status: 400 });

  setPasswordHash(user.id, await hashPassword(parsed.data.password));
  deleteAllUserSessions(user.id);
  await signIn(user.id);

  return NextResponse.json({ ok: true });
}
