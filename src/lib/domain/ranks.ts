import { RANK_SLUGS, type RankSlug } from "./types";
import { createT, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/core";

/**
 * The Norse rank ladder (spec §9). Ranks are cosmetic progression — titles,
 * colours, badge frames — and never gate core features. `rankLevel` on a user
 * (0..5) indexes into this ladder.
 */
export interface RankInfo {
  level: number;
  slug: RankSlug;
  name: string;
  /** Accent colour used for the rank chip / frame. */
  color: string;
}

const COLORS = ["#8b95a1", "#9c7b4a", "#c98b3a", "#d9615a", "#e0a83e", "#f2bd53"];

export function rankForLevel(level: number, locale: Locale = DEFAULT_LOCALE): RankInfo {
  const clamped = Math.max(0, Math.min(RANK_SLUGS.length - 1, Math.floor(level)));
  const slug = RANK_SLUGS[clamped];
  const t = createT(locale);
  return { level: clamped, slug, name: t(`ranks.${slug}`), color: COLORS[clamped] };
}

/**
 * Derive a rank level from lifetime achievement points. Kept intentionally
 * simple and monotonic; the exact thresholds can be tuned without touching the
 * ladder. Points come from sessions + PRs + week-streaks (see gamification).
 */
export function rankLevelFromPoints(points: number): number {
  const thresholds = [0, 5, 20, 50, 100, 200];
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) if (points >= thresholds[i]) level = i;
  return level;
}
