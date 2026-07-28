import type { CoachTone } from "@/lib/domain/types";
import type { Locale } from "@/lib/i18n/core";

/**
 * Huginn & Muninn — the voice of Uruz's reminders, praise and gentle nudges
 * (spec §8).
 *
 * Tone rules, which are not negotiable:
 *   - Praise is concrete: it names what the user actually did.
 *   - A nudge is an invitation, never an accusation. No shame, no guilt, and
 *     never a word about body or weight.
 *   - "Hard" tone means blunt and a bit teasing — still warm underneath. It is
 *     the user's own choice, and it is still kind.
 *
 * Messages are picked deterministically from a seed so the same day doesn't
 * produce a different text on every render.
 */

export type RavenKind = "reminder" | "praise" | "nudge" | "milestone" | "rivalry";

export interface RavenMessage {
  title: string;
  body: string;
}

export interface RavenContext {
  displayName: string;
  tone: CoachTone;
  locale: Locale;
  /** Days since the last logged session, if any. */
  daysSinceLast?: number;
  /** Current week streak. */
  streakWeeks?: number;
  /** A hall-mate who trained recently, for friendly rivalry. */
  rivalName?: string;
  /** Free detail, e.g. an exercise name or a milestone label. */
  detail?: string;
  /** Stable seed so a given day yields a stable message. */
  seed?: number;
}

type Variants = { da: string[]; en: string[] };

/** Pick deterministically, so the text is stable for a given seed. */
function pick(variants: string[], seed: number): string {
  if (variants.length === 0) return "";
  return variants[Math.abs(Math.floor(seed)) % variants.length];
}

function fill(template: string, ctx: RavenContext): string {
  return template
    .replace(/\{name\}/g, ctx.displayName)
    .replace(/\{rival\}/g, ctx.rivalName ?? "")
    .replace(/\{detail\}/g, ctx.detail ?? "")
    .replace(/\{streak\}/g, String(ctx.streakWeeks ?? 0))
    .replace(/\{days\}/g, String(ctx.daysSinceLast ?? 0));
}

// ---- Message banks -------------------------------------------------------

const REMINDER_SOFT: Variants = {
  da: [
    "Det er træningsdag ⚡ Ravnene siger, hallen venter.",
    "Dagens rune kalder. Skal vi tage en tur i centret?",
    "Huginn minder dig om, at i dag er en træningsdag.",
    "Tid til at bygge lidt styrke. Selv en kort tur tæller.",
  ],
  en: [
    "It's training day ⚡ The ravens say the hall is waiting.",
    "Today's rune is calling. Shall we head to the gym?",
    "Huginn reminds you that today is a training day.",
    "Time to build a little strength. Even a short session counts.",
  ],
};

const REMINDER_HARD: Variants = {
  da: [
    "Træningsdag. Ingen undskyldninger, {name} — ravnene holder øje.",
    "Op af stolen, {name}. Jernet flytter ikke sig selv.",
    "Muninn husker at du sagde i dag. Så gør vi det.",
    "Hallen står tom uden dig. Kom så.",
  ],
  en: [
    "Training day. No excuses, {name} — the ravens are watching.",
    "Up you get, {name}. The iron won't move itself.",
    "Muninn remembers you said today. So let's go.",
    "The hall stands empty without you. Come on.",
  ],
};

const PRAISE_SOFT: Variants = {
  da: [
    "Flot træning, {name}. Det tæller.",
    "Godt gået — du mødte op, og det er hele kunsten.",
    "{streak} uger i træk. Solidt bygget, rejsende.",
    "Endnu en tur i hallen er skrevet ind i sagaen.",
  ],
  en: [
    "Good session, {name}. That counts.",
    "Well done — you showed up, and that's the whole trick.",
    "{streak} weeks in a row. Solidly built, traveller.",
    "Another trip to the hall written into the saga.",
  ],
};

const PRAISE_HARD: Variants = {
  da: [
    "Sådan, {name}. Det var arbejde, ikke snak.",
    "{streak} uger i træk. Du begynder at ligne en bersærk.",
    "Godkendt. Jernet mærkede dig i dag.",
    "Det var stærkt. Ravnene nikker anerkendende.",
  ],
  en: [
    "That's it, {name}. That was work, not talk.",
    "{streak} weeks straight. You're starting to look like a berserker.",
    "Approved. The iron felt you today.",
    "That was strong. The ravens nod in approval.",
  ],
};

/**
 * Nudges after an absence. Deliberately light and self-deprecating on the
 * app's part — never on the user's.
 */
const NUDGE_SOFT: Variants = {
  da: [
    "Der er gået {days} dage. Ingen dom herfra — hallen står der stadig.",
    "Muninn har ikke set dig i {days} dage. Skal vi tage en rolig en?",
    "Livet kommer i vejen nogle gange. Når du er klar, er vi her.",
    "{days} dage siden sidst. En kort tur er stadig en tur.",
  ],
  en: [
    "It's been {days} days. No judgement here — the hall is still standing.",
    "Muninn hasn't seen you in {days} days. Fancy an easy one?",
    "Life gets in the way sometimes. When you're ready, we're here.",
    "{days} days since last time. A short session is still a session.",
  ],
};

const NUDGE_HARD: Variants = {
  da: [
    "{days} dage, {name}. Ravnene er begyndt at hviske.",
    "Støvet lægger sig på din rune. {days} dage. Kom nu.",
    "Muninn husker alt — også de {days} dage. Ret op på det.",
    "Hallen savner larmen fra dine vægte. {days} dage er rigeligt.",
  ],
  en: [
    "{days} days, {name}. The ravens have started whispering.",
    "Dust is settling on your rune. {days} days. Come on.",
    "Muninn remembers everything — including those {days} days. Fix it.",
    "The hall misses the noise of your weights. {days} days is plenty.",
  ],
};

const RIVALRY: Variants = {
  da: [
    "{rival} trænede i går. Din tur, {name}.",
    "{rival} har lagt en træning i hallen. Skal den stå uimodsagt?",
    "Ravnene fortæller at {rival} var i centret. Bare så du ved det.",
  ],
  en: [
    "{rival} trained yesterday. Your turn, {name}.",
    "{rival} put a session in the hall. Will it go unanswered?",
    "The ravens say {rival} was at the gym. Just so you know.",
  ],
};

const MILESTONE: Variants = {
  da: [
    "Milepæl nået: {detail}. Det er løftet, ikke talt.",
    "Du har nu løftet {detail} tilsammen. Sagaen vokser.",
    "{detail} — samlet. Det er noget af en bunke jern.",
  ],
  en: [
    "Milestone reached: {detail}. Lifted, not counted.",
    "You have now lifted {detail} in total. The saga grows.",
    "{detail} — all together. That's quite a pile of iron.",
  ],
};

const TITLES: Record<RavenKind, Variants> = {
  reminder: { da: ["Uruz ᚢ — træningsdag"], en: ["Uruz ᚢ — training day"] },
  praise: { da: ["Godt gået ⚡"], en: ["Well done ⚡"] },
  nudge: { da: ["Ravnene kalder"], en: ["The ravens are calling"] },
  milestone: { da: ["Milepæl nået 🏆"], en: ["Milestone reached 🏆"] },
  rivalry: { da: ["Valhal rører på sig"], en: ["Valhalla stirs"] },
};

function bankFor(kind: RavenKind, tone: CoachTone): Variants {
  switch (kind) {
    case "reminder":
      return tone === "hard" ? REMINDER_HARD : REMINDER_SOFT;
    case "praise":
      return tone === "hard" ? PRAISE_HARD : PRAISE_SOFT;
    case "nudge":
      return tone === "hard" ? NUDGE_HARD : NUDGE_SOFT;
    case "rivalry":
      return RIVALRY;
    case "milestone":
      return MILESTONE;
  }
}

/** Compose a raven message for a given situation. */
export function ravenMessage(kind: RavenKind, ctx: RavenContext): RavenMessage {
  const seed = ctx.seed ?? 0;
  const bank = bankFor(kind, ctx.tone);
  const variants = ctx.locale === "en" ? bank.en : bank.da;
  const titles = ctx.locale === "en" ? TITLES[kind].en : TITLES[kind].da;
  return {
    title: fill(pick(titles, seed), ctx),
    body: fill(pick(variants, seed), ctx),
  };
}

/**
 * Decide whether a nudge is warranted, and how hard.
 *
 * Nothing before four days: a normal 2-3x/week lifter has ordinary rest days,
 * and pestering someone on their rest day is how an app gets deleted. After
 * three weeks the app goes quiet entirely rather than nagging indefinitely.
 */
export function shouldNudge(daysSinceLast: number): boolean {
  return daysSinceLast >= 4 && daysSinceLast <= 21;
}
