import { getDb, newId, nowIso, type Row } from "../sqlite";
import { mapCoachMessage } from "../mappers";
import type { CoachMessage, CoachMessageKind } from "@/lib/domain/types";

export interface AddCoachMessageInput {
  userId: string;
  kind: CoachMessageKind;
  body: string;
  dataJson?: Record<string, unknown> | null;
}

export function addCoachMessage(input: AddCoachMessageInput): CoachMessage {
  const id = newId();
  getDb()
    .prepare(
      "INSERT INTO coach_messages (id, user_id, kind, body, data_json, created_at) VALUES (?,?,?,?,?,?)",
    )
    .run(
      id,
      input.userId,
      input.kind,
      input.body,
      input.dataJson ? JSON.stringify(input.dataJson) : null,
      nowIso(),
    );
  const row = getDb().prepare("SELECT * FROM coach_messages WHERE id = ?").get(id) as Row;
  return mapCoachMessage(row);
}

export function listCoachMessages(userId: string, limit = 30): CoachMessage[] {
  const rows = getDb()
    .prepare("SELECT * FROM coach_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as Row[];
  return rows.map(mapCoachMessage);
}

export function countUnreadCoachMessages(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM coach_messages WHERE user_id = ? AND read_at IS NULL")
    .get(userId) as Row;
  return Number(row.n);
}

export function markCoachMessagesRead(userId: string): void {
  getDb()
    .prepare("UPDATE coach_messages SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(nowIso(), userId);
}

/** Most recent message of a given kind, used to avoid repeating an analysis. */
export function latestCoachMessage(
  userId: string,
  kind: CoachMessageKind,
): CoachMessage | null {
  const row = getDb()
    .prepare(
      "SELECT * FROM coach_messages WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId, kind) as Row | undefined;
  return row ? mapCoachMessage(row) : null;
}
