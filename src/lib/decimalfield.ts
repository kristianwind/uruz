/**
 * What somebody is typing into a number field, while they are still typing it.
 *
 * A half-written number is text, and it has to stay text until the person is
 * done. The weight stepper used to show `String(value)` and nothing else, so
 * every keystroke went out through a number and came back: type `85,` and it
 * became `Number("85.")` — 85 — and the field redrew as `85`. The separator was
 * gone before the next digit could be typed, so 85,8 could not be written at all.
 *
 * Pure, and here rather than in the component, because the rule is the part that
 * was wrong and the part worth a test. The component owns the field; this owns
 * what a keystroke means.
 */

/**
 * Digits and at most one separator, comma or full stop.
 *
 * A Danish keyboard's decimal key is a comma and an English one's is a full stop;
 * both people are entering the same weight. Anything else is dropped rather than
 * refused — a stray character should not empty a field somebody is mid-way
 * through, and in a gym the stray character is a thumb.
 */
export function asTyped(raw: string): string {
  const [head, ...rest] = raw.replace(",", ".").replace(/[^0-9.]/g, "").split(".");
  return rest.length ? `${head}.${rest.join("")}` : head;
}

/**
 * The number a piece of typing means so far, or null while it does not mean one
 * yet.
 *
 * `""` and `"85."` are on the way to a number without being one. Reporting 0 for
 * the first would wipe a set the moment somebody selected the field to retype it;
 * reporting nothing at all for the second would lose the 85 they had already
 * written. So: empty means nothing yet, and a trailing separator means the number
 * in front of it.
 */
export function typedValue(text: string): number | null {
  if (text === "" || text === ".") return null;
  const n = Number(text.endsWith(".") ? text.slice(0, -1) : text);
  return Number.isNaN(n) ? null : n;
}
