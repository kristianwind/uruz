import { getDb, fromBool, newId, nowIso, type Row } from "../sqlite";
import { mapUser } from "../mappers";
import type { Role, User } from "@/lib/domain/types";

export function getUser(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
  return row ? mapUser(row) : null;
}

export function getUserByEmail(email: string): User | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email) as Row | undefined;
  return row ? mapUser(row) : null;
}

export function listHallUsers(hallId: string): User[] {
  const rows = getDb()
    .prepare("SELECT * FROM users WHERE hall_id = ? ORDER BY created_at")
    .all(hallId) as Row[];
  return rows.map(mapUser);
}

export interface CreateUserInput {
  hallId: string;
  email: string;
  displayName: string;
  role?: Role;
}

export function createUser(input: CreateUserInput): User {
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO users (id, hall_id, email, display_name, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.hallId, input.email, input.displayName, input.role ?? "member", nowIso());
  // Every user gets a streak row so gamification has something to update.
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO streaks (id, user_id, freeze_tokens) VALUES (?, ?, 2)",
    )
    .run(newId(), id);
  return getUser(id)!;
}

/** Whitelisted user-preference / profile updates. */
export type UserPatch = Partial<
  Pick<
    User,
    | "displayName"
    | "themePref"
    | "modePref"
    | "localePref"
    | "mediaPref"
    | "difficulty"
    | "coachTone"
    | "isPrivate"
    | "isActive"
    | "role"
    | "rankLevel"
    | "avatar"
  >
>;

const PATCH_COLUMNS: Record<keyof UserPatch, string> = {
  displayName: "display_name",
  themePref: "theme_pref",
  modePref: "mode_pref",
  localePref: "locale_pref",
  mediaPref: "media_pref",
  difficulty: "difficulty",
  coachTone: "coach_tone",
  isPrivate: "is_private",
  isActive: "is_active",
  role: "role",
  rankLevel: "rank_level",
  avatar: "avatar",
};

export function updateUser(id: string, patch: UserPatch): User | null {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const col = PATCH_COLUMNS[key as keyof UserPatch];
    if (!col) continue;
    sets.push(`${col} = ?`);
    values.push(typeof value === "boolean" ? fromBool(value) : value);
  }
  if (sets.length === 0) return getUser(id);
  values.push(id);
  getDb()
    .prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
    .run(...(values as never[]));
  return getUser(id);
}

/**
 * Remove a user and, through ON DELETE CASCADE, everything that hangs off the
 * row: sessions, sets, records, badges, coach messages, reminders and push
 * subscriptions. True when a row was actually deleted.
 */
export function deleteUser(id: string): boolean {
  const res = getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
  return Number(res.changes) > 0;
}

export function countAdmins(hallId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE hall_id = ? AND role = 'admin' AND is_active = 1")
    .get(hallId) as Row;
  return Number(row.n);
}
