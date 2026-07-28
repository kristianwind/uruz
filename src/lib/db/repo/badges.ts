import { getDb, newId, nowIso, type Row } from "../sqlite";
import { mapBadge, mapUserBadge } from "../mappers";
import type { Badge, BadgeTier, UserBadge } from "@/lib/domain/types";

export function listBadges(): Badge[] {
  const rows = getDb().prepare("SELECT * FROM badges ORDER BY tier, name").all() as Row[];
  return rows.map(mapBadge);
}

export function getBadgeBySlug(slug: string): Badge | null {
  const row = getDb().prepare("SELECT * FROM badges WHERE slug = ?").get(slug) as Row | undefined;
  return row ? mapBadge(row) : null;
}

export interface BadgeInput {
  slug: string;
  name: string;
  description: string;
  runeSymbol: string;
  tier: BadgeTier;
  criteriaJson: Record<string, unknown>;
}

export function upsertBadge(b: BadgeInput): Badge {
  getDb()
    .prepare(
      `INSERT INTO badges (id, slug, name, description, rune_symbol, tier, criteria_json)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET
         name=excluded.name, description=excluded.description,
         rune_symbol=excluded.rune_symbol, tier=excluded.tier,
         criteria_json=excluded.criteria_json`,
    )
    .run(newId(), b.slug, b.name, b.description, b.runeSymbol, b.tier, JSON.stringify(b.criteriaJson));
  return getBadgeBySlug(b.slug)!;
}

export function listUserBadges(userId: string): UserBadge[] {
  const rows = getDb()
    .prepare("SELECT * FROM user_badges WHERE user_id = ?")
    .all(userId) as Row[];
  return rows.map(mapUserBadge);
}

/** Award or update progress toward a badge (idempotent per user+badge). */
export function setUserBadge(
  userId: string,
  badgeId: string,
  progress: number,
  earned: boolean,
): void {
  getDb()
    .prepare(
      `INSERT INTO user_badges (id, user_id, badge_id, earned_at, progress)
       VALUES (?,?,?,?,?)
       ON CONFLICT(user_id, badge_id) DO UPDATE SET
         progress=excluded.progress,
         earned_at=COALESCE(user_badges.earned_at, excluded.earned_at)`,
    )
    .run(newId(), userId, badgeId, earned ? nowIso() : null, Math.min(1, Math.max(0, progress)));
}
