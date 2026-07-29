import { DumbbellIcon, ChartIcon, ShieldIcon, UserIcon } from "@/components/ui/icons";

/**
 * The four main destinations, shared by the phone's tab bar and the wide
 * screen's side rail. One list, so the two can never drift apart.
 *
 * Labels are keys, not text: they are resolved inside the components so they
 * follow the active locale.
 */
export const NAV_ITEMS = [
  { href: "/train", key: "nav.train", Icon: DumbbellIcon },
  { href: "/stats", key: "nav.stats", Icon: ChartIcon },
  { href: "/valhal", key: "nav.valhal", Icon: ShieldIcon },
  { href: "/me", key: "nav.me", Icon: UserIcon },
] as const;
