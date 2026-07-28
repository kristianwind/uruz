import "server-only";
import { chat, isAIConfigured, AIError } from "@/lib/ai/provider";
import { buildInsights, summariseForModel, type Insight } from "./insights";
import { loadUserData } from "@/lib/domain/gamification-service";
import { listExercises } from "@/lib/db/repo/exercises";
import { getUser } from "@/lib/db/repo/users";
import { addCoachMessage } from "@/lib/db/repo/coach";
import { listConstraints } from "@/lib/db/repo/constraints";
import { describeConstraints } from "./adapt";
import type { CoachTone, Difficulty, User } from "@/lib/domain/types";

/**
 * Mimir — the coaching service (spec §7).
 *
 * Design rules:
 *   - Never blocks training. Every entry point returns fast or in the
 *     background, and a model failure degrades to the deterministic insights.
 *   - Only anonymised, aggregated numbers are sent to the model: no names, no
 *     e-mail, no ids. The model sees "benpres: 60, 62.5, 62.5", not a person.
 *   - The tone follows the user's own settings (level + soft/hard), and safety
 *     rules are non-negotiable regardless of tone.
 */

const WEEKLY_GOAL = 2;

/** Guard rails that apply to every Mimir response, whatever the tone. */
const SAFETY_RULES = `
Ufravigelige regler:
- Du rådgiver KUN om styrketræning, restitution og motivation.
- Giv ALDRIG kost-, protein-, kalorie- eller vægttabsråd, heller ikke hvis der
  spørges direkte. Sig i stedet kort at kost ligger uden for din opgave.
- Du er ikke læge. Ved smerte, skade eller vedvarende ubehag: anbefal en lettere
  variant og henvis venligt til læge eller fysioterapeut. Lov aldrig helbredelse.
- Kommentér aldrig på kropsvægt eller udseende, og brug aldrig skam som
  motivation.
- Foreslå aldrig kosttilskud, medicin eller ekstreme vægtspring.
- Hold dig til brugerens egne data. Find ikke på tal du ikke har fået.
- Respektér ALTID brugerens kendte skavanker og ønsker i alt hvad du foreslår.
`.trim();

function toneInstruction(tone: CoachTone, level: Difficulty): string {
  const warmth =
    tone === "hard"
      ? "Vær direkte og kontant, men altid god og kærlig i ånden — aldrig nedladende."
      : "Vær varm, rolig og opmuntrende.";
  const depth =
    level === "begynder"
      ? "Brugeren er begynder: forklar hvorfor, undgå fagudtryk, og hold forslagene små og trygge."
      : level === "erfaren"
        ? "Brugeren er erfaren: du må bruge RIR, RPE og volumen som begreber."
        : "Brugeren er øvet: du må gå teknisk til værks med periodisering, tonnage, frekvens og intensitet.";
  return `${warmth} ${depth}`;
}

function systemPrompt(user: User, purpose: string): string {
  return [
    "Du er Mimir, den kloge jætte fra nordisk mytologi, som coacher i træningsappen Uruz.",
    "Du taler dansk, kort og konkret. Ingen indledende høflighedsfraser.",
    toneInstruction(user.coachTone, user.difficulty),
    purpose,
    SAFETY_RULES,
  ].join("\n\n");
}

export interface CoachReply {
  body: string;
  /** True when a language model produced the text, false for the rule fallback. */
  fromModel: boolean;
}

/**
 * Weekly analysis: 2–3 concrete, friendly suggestions based on the last weeks
 * of training. Falls back to the deterministic insights if no model answers.
 */
export async function analyzeWeek(userId: string): Promise<CoachReply | null> {
  const user = getUser(userId);
  if (!user) return null;

  const data = loadUserData(userId);
  if (data.length === 0) return null;

  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const ctx = { data, exercises, weeklyGoal: WEEKLY_GOAL };
  const insights = buildInsights(ctx);
  if (insights.length === 0) return null;

  const fallback = renderInsights(insights.slice(0, 3));

  if (!isAIConfigured()) {
    const stored = addCoachMessage({
      userId,
      kind: "opsummering",
      body: fallback,
      dataJson: { source: "rules", kinds: insights.slice(0, 3).map((i) => i.kind) },
    });
    void stored;
    return { body: fallback, fromModel: false };
  }

  try {
    const body = await chat(
      [
        {
          role: "system",
          content: systemPrompt(
            user,
            "Opgave: giv en kort ugentlig analyse med 2-3 konkrete forslag. Brug punktopstilling med '-'. Maks 120 ord i alt.",
          ),
        },
        {
          role: "user",
          content: [
            "Her er mine træningsdata (anonymiserede):",
            JSON.stringify(summariseForModel(ctx), null, 1),
            "",
            "Mine skavanker og ønsker:",
            describeConstraints(listConstraints(userId)),
            "",
            "Systemet har fundet disse mønstre:",
            ...insights.slice(0, 4).map((i) => `- [${i.kind}] ${i.text}`),
            "",
            "Skriv ugens analyse.",
          ].join("\n"),
        },
      ],
      { maxTokens: 4000, temperature: 0.7, timeoutMs: 120_000 },
    );

    const text = body.trim() || fallback;
    addCoachMessage({
      userId,
      kind: "opsummering",
      body: text,
      dataJson: { source: "model", kinds: insights.slice(0, 3).map((i) => i.kind) },
    });
    return { body: text, fromModel: body.trim().length > 0 };
  } catch (err) {
    // A model outage must never cost the user their coaching.
    console.error("Mimir analyzeWeek failed:", err instanceof AIError ? err.message : err);
    addCoachMessage({
      userId,
      kind: "opsummering",
      body: fallback,
      dataJson: { source: "rules_fallback" },
    });
    return { body: fallback, fromModel: false };
  }
}

/**
 * Free-text question ("jeg har kun 25 min i dag, hvad gør jeg?"), answered
 * against the user's own data plus the exercise library.
 */
export async function askCoach(userId: string, question: string): Promise<CoachReply | null> {
  const user = getUser(userId);
  if (!user) return null;

  const trimmed = question.trim().slice(0, 500);
  if (!trimmed) return null;

  const data = loadUserData(userId);
  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const ctx = { data, exercises, weeklyGoal: WEEKLY_GOAL };

  if (!isAIConfigured()) {
    const insights = buildInsights(ctx);
    const body =
      insights.length > 0
        ? `Mimir er ikke koblet til en sprogmodel lige nu, men her er hvad dine tal viser:\n\n${renderInsights(insights.slice(0, 2))}`
        : "Mimir er ikke koblet til en sprogmodel lige nu. Log et par træninger, så kan jeg give dig konkrete forslag ud fra dine egne tal.";
    addCoachMessage({ userId, kind: "forslag", body, dataJson: { source: "rules", question: trimmed } });
    return { body, fromModel: false };
  }

  const library = listExercises()
    .map((e) => `${e.nameDa} (${e.category}, ${e.equipment})`)
    .join("; ");

  try {
    const body = await chat(
      [
        {
          role: "system",
          content: systemPrompt(
            user,
            "Opgave: svar på brugerens spørgsmål. Vær konkret og handlingsanvisende. Maks 150 ord. Foreslå kun øvelser fra biblioteket.",
          ),
        },
        {
          role: "user",
          content: [
            `Spørgsmål: ${trimmed}`,
            "",
            "Mine skavanker og ønsker:",
            describeConstraints(listConstraints(userId)),
            "",
            "Mine data (anonymiserede):",
            JSON.stringify(summariseForModel(ctx), null, 1),
            "",
            `Øvelser i biblioteket: ${library}`,
          ].join("\n"),
        },
      ],
      { maxTokens: 4000, temperature: 0.7, timeoutMs: 120_000 },
    );

    const text = body.trim();
    if (!text) throw new AIError("empty response");
    addCoachMessage({
      userId,
      kind: "forslag",
      body: text,
      dataJson: { source: "model", question: trimmed },
    });
    return { body: text, fromModel: true };
  } catch (err) {
    console.error("Mimir askCoach failed:", err instanceof AIError ? err.message : err);
    const body =
      "Mimir kunne ikke nås lige nu. Prøv igen om lidt — dine træninger er gemt som de skal.";
    return { body, fromModel: false };
  }
}

/**
 * A short, playful summary of the week in a light Norse storytelling voice
 * ("Ugens saga", spec §13). Purely decorative — skipped without a model.
 */
export async function weeklySaga(userId: string): Promise<CoachReply | null> {
  const user = getUser(userId);
  if (!user || !isAIConfigured()) return null;

  const data = loadUserData(userId);
  if (data.length === 0) return null;

  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const ctx = { data, exercises, weeklyGoal: WEEKLY_GOAL };

  try {
    const body = await chat(
      [
        {
          role: "system",
          content: systemPrompt(
            user,
            "Opgave: skriv 'Ugens saga' — 2-3 sætninger om ugens træning i let, sjov nordisk fortællestil. Ingen råd, kun fortælling.",
          ),
        },
        {
          role: "user",
          content: JSON.stringify(summariseForModel(ctx), null, 1),
        },
      ],
      { maxTokens: 3000, temperature: 0.9, timeoutMs: 120_000 },
    );
    const text = body.trim();
    if (!text) return null;
    addCoachMessage({ userId, kind: "opsummering", body: text, dataJson: { source: "saga" } });
    return { body: text, fromModel: true };
  } catch {
    return null;
  }
}

/** Render insights as a plain bulleted list — the no-model presentation. */
function renderInsights(insights: Insight[]): string {
  return insights.map((i) => `- ${i.text}`).join("\n");
}
