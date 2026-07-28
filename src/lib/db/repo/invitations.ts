import { getDb, newId, type Row } from "../sqlite";
import { mapInvitation } from "../mappers";
import type { Invitation, Role } from "@/lib/domain/types";

const INVITE_TTL_DAYS = 14;

/** Short, human-typable invite code (unambiguous alphabet). */
export function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function listInvitations(hallId: string): Invitation[] {
  const rows = getDb()
    .prepare("SELECT * FROM invitations WHERE hall_id = ? ORDER BY status, email")
    .all(hallId) as Row[];
  return rows.map(mapInvitation);
}

export function getInvitationByCode(code: string): Invitation | null {
  const row = getDb()
    .prepare("SELECT * FROM invitations WHERE code = ?")
    .get(code.trim().toUpperCase()) as Row | undefined;
  return row ? mapInvitation(row) : null;
}

export interface CreateInvitationInput {
  hallId: string;
  email: string;
  invitedBy: string;
  role?: Role;
  code?: string;
}

export function createInvitation(input: CreateInvitationInput): Invitation {
  const id = newId();
  const code = (input.code ?? generateCode()).toUpperCase();
  const expires = new Date(Date.now() + INVITE_TTL_DAYS * 86400_000).toISOString();
  getDb()
    .prepare(
      `INSERT INTO invitations (id, hall_id, email, code, invited_by, role, status, expires_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(id, input.hallId, input.email, code, input.invitedBy, input.role ?? "member", "pending", expires);
  const row = getDb().prepare("SELECT * FROM invitations WHERE id = ?").get(id) as Row;
  return mapInvitation(row);
}

export function setInvitationStatus(id: string, status: Invitation["status"]): void {
  getDb().prepare("UPDATE invitations SET status = ? WHERE id = ?").run(status, id);
}

export function isInvitationUsable(inv: Invitation): boolean {
  return inv.status === "pending" && new Date(inv.expiresAt).getTime() > Date.now();
}
