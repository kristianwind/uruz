import { Fragment } from "react";

/**
 * Render Mimir's replies with the light markdown models naturally produce.
 *
 * Deliberately tiny and allow-list based — it builds React elements rather than
 * injecting HTML, so model output can never introduce markup into the page.
 * Supports **bold**, `-`/`*`/`1.` bullets and blank-line paragraphs; anything
 * else is shown as plain text.
 */
export function CoachText({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l.trim()) || !l.trim());
        const items = lines.filter((l) => l.trim());

        if (isList && items.length > 0) {
          return (
            <ul key={bi} className="mb-2 flex list-none flex-col gap-1.5 last:mb-0">
              {items.map((line, li) => (
                <li key={li} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>{inline(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bi} className="mb-2 last:mb-0">
            {block.split("\n").map((line, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Split a line on **bold** runs and emphasise them. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).flatMap((part, i) => {
    if (!part) return [];
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    return bold ? (
      <strong key={i} className="font-semibold text-text">
        {bold[1]}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
}
