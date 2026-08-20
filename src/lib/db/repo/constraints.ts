import { getDb, fromBool, newId, nowIso, type Row } from "../sqlite";

/**
 * Ailments and wishes the user has told Kvasir about.
 *
 * These are long-lived on purpose: a sore shoulder mentioned once should shape
 * every later suggestion until the user says it is better. Forgetting it would
 * make the coach untrustworthy.
 */

export type ConstraintKind = "skavank" | "oenske";

export interface UserConstraint {
  id: string;
  userId: string;
  kind: ConstraintKind;
  body: string;
  data: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

function map(r: Row): UserConstraint {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    kind: String(r.kind) as ConstraintKind,
    body: String(r.body),
    data: r.data_json ? JSON.parse(String(r.data_json)) : null,
    isActive: r.is_active === 1,
    createdAt: String(r.created_at),
    resolvedAt: r.resolved_at ? String(r.resolved_at) : null,
  };
}

export function addConstraint(input: {
  userId: string;
  kind: ConstraintKind;
  body: string;
  data?: Record<string, unknown> | null;
}): UserConstraint {
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO user_constraints (id, user_id, kind, body, data_json, is_active, created_at)
       VALUES (?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.userId,
      input.kind,
      input.body.trim(),
      input.data ? JSON.stringify(input.data) : null,
      fromBool(true),
      nowIso(),
    );
  return getConstraint(id)!;
}

export function getConstraint(id: string): UserConstraint | null {
  const row = getDb().prepare("SELECT * FROM user_constraints WHERE id = ?").get(id) as
    | Row
    | undefined;
  return row ? map(row) : null;
}

export function listConstraints(userId: string, activeOnly = true): UserConstraint[] {
  const sql = activeOnly
    ? "SELECT * FROM user_constraints WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC"
    : "SELECT * FROM user_constraints WHERE user_id = ? ORDER BY created_at DESC";
  return (getDb().prepare(sql).all(userId) as Row[]).map(map);
}

/** Mark an ailment as over, or a wish as no longer wanted. */
export function resolveConstraint(id: string, userId: string): void {
  getDb()
    .prepare(
      "UPDATE user_constraints SET is_active = 0, resolved_at = ? WHERE id = ? AND user_id = ?",
    )
    .run(nowIso(), id, userId);
}

export function deleteConstraint(id: string, userId: string): void {
  getDb().prepare("DELETE FROM user_constraints WHERE id = ? AND user_id = ?").run(id, userId);
}
