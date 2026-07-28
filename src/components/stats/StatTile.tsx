import { cn } from "@/lib/utils";

/** Compact numeric readout. Big number first — that's what people scan for. */
export function StatTile({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "green" | "plain";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-elev p-3 text-center",
        className,
      )}
    >
      <p
        className={cn(
          "tabnum text-xl font-bold leading-tight",
          accent === "gold" && "text-accent",
          accent === "green" && "text-success",
          !accent && "text-text",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-faint">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-tight text-muted">{sub}</p>}
    </div>
  );
}
