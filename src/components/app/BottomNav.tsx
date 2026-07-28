"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import {
  DumbbellIcon,
  ChartIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/ui/icons";

// Labels are resolved inside the component so they follow the active locale.
const ITEMS = [
  { href: "/train", key: "nav.train", Icon: DumbbellIcon },
  { href: "/stats", key: "nav.stats", Icon: ChartIcon },
  { href: "/valhal", key: "nav.valhal", Icon: ShieldIcon },
  { href: "/me", key: "nav.me", Icon: UserIcon },
] as const;

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav
      aria-label={t("nav.train")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-elev/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active ? "text-accent" : "text-faint hover:text-muted",
                )}
              >
                <Icon size={24} className={active ? "drop-shadow-[0_0_6px_var(--accent)]" : ""} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
