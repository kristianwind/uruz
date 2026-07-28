import "server-only";
import { getDb, newId, nowIso, type Row } from "@/lib/db/sqlite";

/**
 * Append-only audit log for admin + auth actions (spec §10). Never throws into
 * the caller — auditing must not break the operation it records.
 */
export function writeAudit(
  hallId: string,
  actorId: string | null,
  action: string,
  target?: string | null,
  data?: Record<string, unknown>,
): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO audit_log (id, hall_id, actor_id, action, target, data_json, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        newId(),
        hallId,
        actorId,
        action,
        target ?? null,
        data ? JSON.stringify(data) : null,
        nowIso(),
      );
  } catch (err) {
    console.error("writeAudit failed:", err);
  }
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  target: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export function listAudit(hallId: string, limit = 100): AuditEntry[] {
  const rows = getDb()
    .prepare("SELECT * FROM audit_log WHERE hall_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(hallId, limit) as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    actorId: r.actor_id ? String(r.actor_id) : null,
    action: String(r.action),
    target: r.target ? String(r.target) : null,
    data: r.data_json ? JSON.parse(String(r.data_json)) : null,
    createdAt: String(r.created_at),
  }));
}
