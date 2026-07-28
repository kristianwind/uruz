import { getDb, newId, nowIso, type Row } from "../sqlite";
import { mapHall } from "../mappers";
import type { Hall } from "@/lib/domain/types";

export function getHall(id: string): Hall | null {
  const row = getDb().prepare("SELECT * FROM halls WHERE id = ?").get(id) as Row | undefined;
  return row ? mapHall(row) : null;
}

export function getAnyHall(): Hall | null {
  const row = getDb().prepare("SELECT * FROM halls ORDER BY created_at LIMIT 1").get() as
    | Row
    | undefined;
  return row ? mapHall(row) : null;
}

export function createHall(name: string, id: string = newId()): Hall {
  getDb()
    .prepare("INSERT INTO halls (id, name, created_at) VALUES (?, ?, ?)")
    .run(id, name, nowIso());
  return getHall(id)!;
}

/** True when no users exist yet — drives the admin-first first-run flow. */
export function isFirstRun(): boolean {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as Row;
  return Number(row.n) === 0;
}
