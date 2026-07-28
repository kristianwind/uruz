import { cn } from "@/lib/utils";

export interface BadgeView {
  slug: string;
  name: string;
  description: string;
  runeSymbol: string;
  tier: "bronze" | "soelv" | "guld";
  earned: boolean;
  progress: number;
}

const TIER_COLOR: Record<BadgeView["tier"], string> = {
  bronze: "#c98b3a",
  soelv: "#b9c2cc",
  guld: "#e0a83e",
};

/**
 * Runes the user has unlocked. Locked runes stay visible but dimmed, with a
 * progress ring — knowing what's next is most of the motivation.
 */
export function BadgeGrid({ badges }: { badges: BadgeView[] }) {
  return (
    <ul className="grid grid-cols-4 gap-3">
      {badges.map((b) => {
        const color = TIER_COLOR[b.tier];
        return (
          <li key={b.slug} className="flex flex-col items-center gap-1 text-center">
            <span
              title={`${b.name} — ${b.description}`}
              className={cn(
                "relative grid h-14 w-14 place-items-center rounded-xl border text-2xl",
                b.earned ? "animate-ignite" : "opacity-40",
              )}
              style={{
                borderColor: b.earned ? color : "var(--border)",
                background: b.earned ? `${color}1f` : "var(--bg-elev-2)",
                color: b.earned ? color : "var(--text-faint)",
              }}
            >
              {b.runeSymbol}
              {!b.earned && b.progress > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1 rounded-b-xl bg-accent/70"
                  style={{ width: `${Math.round(b.progress * 100)}%` }}
                />
              )}
            </span>
            <span className="text-[10px] leading-tight text-muted">{b.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
