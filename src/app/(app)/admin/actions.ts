"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import { updateUser, getUser, countAdmins, deleteUser } from "@/lib/db/repo/users";
import {
  createInvitation,
  setInvitationStatus,
  listInvitations,
} from "@/lib/db/repo/invitations";
import { upsertExercise, getExerciseBySlug } from "@/lib/db/repo/exercises";
import { renameHall } from "@/lib/db/repo/halls";
import { writeAudit } from "@/lib/audit";
import { sendEmail, inviteEmail } from "@/lib/notify/email";
import { getAppOrigin } from "@/lib/auth/origin";
import { isLocale } from "@/lib/i18n/core";
import type { AppContext } from "@/lib/auth/session";

/**
 * Admin actions.
 *
 * Every one of these re-checks the admin role server-side. Hiding a button in
 * the UI is presentation, not security — the check has to live here.
 */
async function requireAdmin(): Promise<AppContext> {
  const ctx = await requireContext();
  if (ctx.user.role !== "admin") throw new Error("FORBIDDEN");
  return ctx;
}

// ---- Invitations ---------------------------------------------------------

const InviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member", "coach"]).default("member"),
});

/** Invite someone into the hall and e-mail them the link. */
export async function inviteUserAction(
  input: z.infer<typeof InviteSchema>,
): Promise<{ code: string; link: string; emailed: boolean }> {
  const ctx = await requireAdmin();
  const parsed = InviteSchema.parse(input);

  const invite = createInvitation({
    hallId: ctx.hall.id,
    email: parsed.email,
    invitedBy: ctx.user.id,
    role: parsed.role,
  });

  const base = await getAppOrigin();
  const link = `${base}/invite/${invite.code}`;
  // The invitee has no account yet, so there is no preference to honour.
  // The inviter's language is the best available guess at a shared one.
  const mail = inviteEmail(link, ctx.hall.name, isLocale(ctx.user.localePref) ? ctx.user.localePref : undefined);
  const sent = await sendEmail({ to: parsed.email, ...mail });

  writeAudit(ctx.hall.id, ctx.user.id, "invitation_created", invite.id, {
    email: parsed.email,
    role: parsed.role,
  });
  revalidatePath("/admin");
  return { code: invite.code, link, emailed: sent.ok && !sent.dev };
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const ctx = await requireAdmin();
  const invite = listInvitations(ctx.hall.id).find((i) => i.id === invitationId);
  if (!invite) throw new Error("NOT_FOUND");
  setInvitationStatus(invitationId, "revoked");
  writeAudit(ctx.hall.id, ctx.user.id, "invitation_revoked", invitationId);
  revalidatePath("/admin");
}

// ---- The hall itself -----------------------------------------------------

const HallNameSchema = z.string().trim().min(1).max(80);

/** Rename the hall. It is named in a hurry at first run; this undoes that. */
export async function renameHallAction(name: string): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = HallNameSchema.parse(name);
  renameHall(ctx.hall.id, parsed);
  writeAudit(ctx.hall.id, ctx.user.id, "hall_renamed", ctx.hall.id, { name: parsed });
  revalidatePath("/admin");
  revalidatePath("/valhal");
}

// ---- Users ---------------------------------------------------------------

/** Deactivate or reactivate a member. */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const ctx = await requireAdmin();
  const target = getUser(userId);
  if (!target || target.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");

  // Never let the hall lock itself out by deactivating its last admin.
  if (!isActive && target.role === "admin" && countAdmins(ctx.hall.id) <= 1) {
    throw new Error("LAST_ADMIN");
  }
  updateUser(userId, { isActive });
  writeAudit(ctx.hall.id, ctx.user.id, isActive ? "user_activated" : "user_deactivated", userId);
  revalidatePath("/admin");
}

/**
 * Delete a member and all their data, permanently.
 *
 * Typing the member's display name is the same deliberate speed bump as
 * deleting your own account: this is irreversible, and an admin page is a
 * place where a mis-tap must not be able to erase someone's training history.
 * Your own account is deleted under Me, not here — that flow also signs you
 * out properly.
 */
export async function deleteUserAction(userId: string, confirmName: string): Promise<void> {
  const ctx = await requireAdmin();
  const target = getUser(userId);
  if (!target || target.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");
  if (target.id === ctx.user.id) throw new Error("IS_SELF");
  if (confirmName !== target.displayName) throw new Error("CONFIRM_MISMATCH");

  // Same protection as everywhere else: the hall keeps at least one admin.
  if (target.role === "admin" && countAdmins(ctx.hall.id) <= 1) {
    throw new Error("LAST_ADMIN");
  }

  // Audit first: the entry must exist even though the user row is going away.
  writeAudit(ctx.hall.id, ctx.user.id, "user_deleted_by_admin", userId, {
    email: target.email,
  });
  deleteUser(userId);
  revalidatePath("/admin");
  revalidatePath("/valhal");
}

const RoleSchema = z.enum(["admin", "member", "coach"]);

export async function setUserRoleAction(userId: string, role: string): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = RoleSchema.parse(role);
  const target = getUser(userId);
  if (!target || target.hallId !== ctx.hall.id) throw new Error("NOT_FOUND");

  // Same protection: don't demote the only admin.
  if (target.role === "admin" && parsed !== "admin" && countAdmins(ctx.hall.id) <= 1) {
    throw new Error("LAST_ADMIN");
  }
  updateUser(userId, { role: parsed });
  writeAudit(ctx.hall.id, ctx.user.id, "user_role_changed", userId, { role: parsed });
  revalidatePath("/admin");
}

// ---- Shared exercise library --------------------------------------------

const ExercisePatchSchema = z.object({
  slug: z.string().min(1),
  nameDa: z.string().trim().min(1).max(80).optional(),
  nameEn: z.string().trim().max(80).nullable().optional(),
  imageUrl: z.string().trim().url().max(500).nullable().optional(),
  demoVideoUrl: z.string().trim().url().max(500).nullable().optional(),
});

/**
 * Edit an entry in the shared library — currently names and media, which is
 * what an admin realistically wants to correct (and how photos get attached).
 */
export async function updateExerciseAction(
  input: z.infer<typeof ExercisePatchSchema>,
): Promise<void> {
  const ctx = await requireAdmin();
  const parsed = ExercisePatchSchema.parse(input);

  const existing = getExerciseBySlug(parsed.slug);
  if (!existing) throw new Error("NOT_FOUND");

  upsertExercise({
    ...existing,
    nameDa: parsed.nameDa ?? existing.nameDa,
    nameEn: parsed.nameEn === undefined ? existing.nameEn : parsed.nameEn,
    imageUrl: parsed.imageUrl === undefined ? existing.imageUrl : parsed.imageUrl,
    demoVideoUrl:
      parsed.demoVideoUrl === undefined ? existing.demoVideoUrl : parsed.demoVideoUrl,
  });

  writeAudit(ctx.hall.id, ctx.user.id, "exercise_updated", existing.id, { slug: parsed.slug });
  revalidatePath("/admin/library");
  revalidatePath("/library");
}