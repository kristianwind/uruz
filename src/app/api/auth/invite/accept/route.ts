import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getInvitationByCode,
  isInvitationUsable,
  setInvitationStatus,
} from "@/lib/db/repo/invitations";
import { createUser, getUserByEmail } from "@/lib/db/repo/users";
import { signIn } from "@/lib/auth/cookies";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Body = z.object({
  code: z.string().trim().min(4),
  displayName: z.string().trim().min(1).max(60),
});

/**
 * Accept an invitation: create the member account in the inviting hall, mark
 * the invite accepted, and sign the new user in so they can add a passkey.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const invite = getInvitationByCode(parsed.data.code);
  if (!invite || !isInvitationUsable(invite)) {
    return NextResponse.json({ error: "invite_invalid" }, { status: 400 });
  }

  // If a user already exists for this email, just sign them in.
  const existing = getUserByEmail(invite.email);
  const user =
    existing ??
    createUser({
      hallId: invite.hallId,
      email: invite.email,
      displayName: parsed.data.displayName,
      role: invite.role,
    });

  setInvitationStatus(invite.id, "accepted");
  await signIn(user.id);
  writeAudit(invite.hallId, user.id, "invite_accepted", user.id, { code: invite.code });

  return NextResponse.json({ ok: true, userId: user.id });
}
