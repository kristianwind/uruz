import type { Exercise } from "@/lib/domain/types";
import {
  balanceCheck,
  bucketByPeriod,
  exerciseFrequency,
  exerciseProgress,
  sessionsThisWeek,
  weekStreak,
  lifetimeTotals,
  type SessionWithSets,
} from "@/lib/domain/stats";
import { doubleProgression } from "@/lib/domain/strength";

/**
 * Deterministic, data-derived coaching insights.
 *
 * These are the *facts* Kvasir reasons about — and they are also the complete
 * fallback when no AI provider is configured. The app must give useful
 * coaching with no model at all; the LLM only makes the delivery warmer and
 * answers free-text questions.
 */

export type InsightKind =
  | "plateau"
  | "progress"
  | "imbalance"
  | "neglected"
  | "streak"
  | "attendance"
  | "pain"
  | "deload";

export interface Insight {
  kind: InsightKind;
  /** Machine-readable payload, also handed to the model as context. */
  data: Record<string, unknown>;
  /** Ready-to-show Danish sentence, used when no model is available. */
  text: string;
  /** Higher is more worth saying. */
  priority: number;
}

export interface InsightContext {
  data: SessionWithSets[];
  exercises: Map<string, Exercise>;
  weeklyGoal: number;
  today?: Date;
}

/** Words that suggest the user is hurting — handled with care, never ignored. */
const PAIN_WORDS = [
  "smerte", "smerter", "ondt", "øm", "ømt", "skade", "skadet",
  "stikker", "jag", "hugger", "pain", "hurts", "sore", "injur",
];

export function buildInsights(ctx: InsightContext): Insight[] {
  const { data, exercises, weeklyGoal } = ctx;
  const today = ctx.today ?? new Date();
  const insights: Insight[] = [];
  if (data.length === 0) return insights;

  const nameOf = (id: string) => exercises.get(id)?.nameDa ?? id;
  const recent = data.slice(-12);

  // ---- Plateaus and progress, per exercise ----
  for (const { exerciseId } of exerciseFrequency(data).slice(0, 8)) {
    const points = exerciseProgress(data, exerciseId).slice(-6);
    if (points.length < 3) continue;

    const weights = points.map((p) => p.topWeight).filter((w) => w > 0);
    if (weights.length < 3) continue;

    const latest = weights[weights.length - 1];
    const oldest = weights[0];

    // Stuck: the last three sessions all at the same top weight.
    const lastThree = weights.slice(-3);
    if (lastThree.every((w) => w === lastThree[0])) {
      const item = points[points.length - 1];
      const suggestion = doubleProgression({
        lastWeight: latest,
        lastReps: [12, 12, 12],
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 12,
      });
      insights.push({
        kind: "plateau",
        data: { exerciseId, exercise: nameOf(exerciseId), weight: latest, sessions: 3, suggest: suggestion.weight },
        text: `Dit ${nameOf(exerciseId).toLowerCase()} har stået på ${latest} kg i tre træninger — prøv ${suggestion.weight} kg på de første to sæt næste gang.`,
        priority: 8,
      });
      void item;
      continue;
    }

    // Clear progress worth acknowledging.
    if (latest > oldest) {
      const pct = Math.round(((latest - oldest) / oldest) * 100);
      if (pct >= 10) {
        insights.push({
          kind: "progress",
          data: { exerciseId, exercise: nameOf(exerciseId), from: oldest, to: latest, percent: pct },
          text: `${nameOf(exerciseId)} er gået fra ${oldest} kg til ${latest} kg — ${pct}% frem. Solidt bygget.`,
          priority: 6,
        });
      }
    }
  }

  // ---- Push/pull balance ----
  const balance = balanceCheck(recent, exercises);
  if (balance.imbalanced) {
    const pushHeavy = balance.pushPullRatio > 1;
    insights.push({
      kind: "imbalance",
      data: { pushSets: balance.pushSets, pullSets: balance.pullSets, ratio: balance.pushPullRatio },
      text: pushHeavy
        ? `Du har lavet ${balance.pushSets} pres-sæt mod ${balance.pullSets} træk-sæt. Læg en ekstra træk-øvelse ind — det holder skuldrene sunde.`
        : `Du trækker noget mere end du presser (${balance.pullSets} mod ${balance.pushSets} sæt). Lidt mere pres ville balancere det.`,
      priority: 7,
    });
  }

  // ---- Neglected exercises ----
  const frequency = exerciseFrequency(recent);
  if (frequency.length >= 3) {
    const least = frequency[frequency.length - 1];
    const most = frequency[0];
    if (most.sessions - least.sessions >= 3) {
      insights.push({
        kind: "neglected",
        data: { exerciseId: least.exerciseId, exercise: nameOf(least.exerciseId), sessions: least.sessions },
        text: `Du springer ofte ${nameOf(least.exerciseId).toLowerCase()} over (kun ${least.sessions} gange på det seneste). Vil du bytte den til en variant du bedre kan lide?`,
        priority: 5,
      });
    }
  }

  // ---- Attendance and streak ----
  const streak = weekStreak(data, today);
  const thisWeek = sessionsThisWeek(data, today);

  if (streak.currentWeeks >= 3) {
    insights.push({
      kind: "streak",
      data: { weeks: streak.currentWeeks },
      text: `${streak.currentWeeks} uger i træk. Solidt bygget, rejsende.`,
      priority: 7,
    });
  }

  if (thisWeek < weeklyGoal) {
    insights.push({
      kind: "attendance",
      data: { thisWeek, goal: weeklyGoal, missing: weeklyGoal - thisWeek },
      text:
        thisWeek === 0
          ? `Ingen træninger denne uge endnu. Selv en kort 20-minutters tur tæller.`
          : `Du har trænet ${thisWeek} af ${weeklyGoal} gange denne uge — én tur mere, så er ugen i hus.`,
      priority: 6,
    });
  }

  // ---- Pain mentioned in notes ----
  const painful = data
    .slice(-8)
    .filter(({ session }) =>
      session.note ? PAIN_WORDS.some((w) => session.note!.toLowerCase().includes(w)) : false,
    );
  if (painful.length > 0) {
    insights.push({
      kind: "pain",
      data: { count: painful.length, notes: painful.map((p) => p.session.note) },
      text: `Du har nævnt smerte i en note for nylig. Tag den roligt, vælg en lettere variant, og få det set af en læge eller fysioterapeut hvis det bliver ved.`,
      priority: 10,
    });
  }

  // ---- Deload suggestion ----
  const weeks = bucketByPeriod(data, "week");
  if (weeks.length >= 6) {
    const lastSix = weeks.slice(-6);
    const hardWeeks = lastSix.filter((w) => w.sessions >= weeklyGoal).length;
    if (hardWeeks >= 6) {
      insights.push({
        kind: "deload",
        data: { weeks: hardWeeks },
        text: `Seks hårde uger i træk. Overvej en let uge med lavere vægt — kroppen bygger sig stærk mens den hviler.`,
        priority: 4,
      });
    }
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

/** Compact, anonymous summary of the user's training, used as model context. */
export function summariseForModel(ctx: InsightContext): Record<string, unknown> {
  const { data, exercises, weeklyGoal } = ctx;
  const today = ctx.today ?? new Date();
  const totals = lifetimeTotals(data);
  const streak = weekStreak(data, today);
  const weeks = bucketByPeriod(data, "week").slice(-4);

  const perExercise = exerciseFrequency(data)
    .slice(0, 8)
    .map(({ exerciseId, sessions }) => {
      const points = exerciseProgress(data, exerciseId).slice(-4);
      const ex = exercises.get(exerciseId);
      return {
        oevelse: ex?.nameDa ?? exerciseId,
        kategori: ex?.category ?? "?",
        traeninger: sessions,
        seneste_vaegte: points.map((p) => p.topWeight).filter((w) => w > 0),
        seneste_sekunder: points.map((p) => p.bestSeconds).filter((s) => s > 0),
      };
    });

  return {
    traeninger_i_alt: totals.sessions,
    saet_i_alt: totals.sets,
    tonnage_kg: Math.round(totals.volume),
    rekorder: totals.prs,
    uge_stime: streak.currentWeeks,
    denne_uge: sessionsThisWeek(data, today),
    ugentligt_maal: weeklyGoal,
    seneste_uger: weeks.map((w) => ({ uge: w.key, traeninger: w.sessions, volumen: Math.round(w.volume) })),
    oevelser: perExercise,
  };
}
