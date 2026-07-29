"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";
import { NAV_ITEMS } from "./nav-items";
import { CogIcon } from "@/components/ui/icons";

/**
 * The navigation for a screen you are not holding in one hand.
 *
 * The bottom tab bar exists because of thumbs: on a phone the reachable part of
 * the screen is the bottom. On a desktop or an iPad that reasoning is gone, and
 * a bar pinned to the bottom of a tall window is stranded far from everything
 * else. So from 768px up the same destinations move to a rail down the side,
 * where they are always visible and cost nothing from the content.
 *
 * Below 768px this renders nothing — the phone keeps the tab bar it was
 * designed around.
 */
export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.train")}
      className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-elev/60 px-3 py-5 md:flex"
    >
      <Link href="/train" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-xl text-accent">
          ᚢ
        </span>
        <span className="text-lg font-bold text-text">Uruz</span>
      </Link>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-elev-2 hover:text-text",
                )}
              >
                <Icon size={20} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Admin is a tab-bar afterthought on a phone — reached through Me. With a
          rail there is room to put it where an admin would look for it. */}
      {isAdmin && (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={cn(
            "mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname.startsWith("/admin")
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-elev-2 hover:text-text",
          )}
        >
          <CogIcon size={20} />
          {t("me.admin")}
        </Link>
      )}
    </nav>
  );
}
