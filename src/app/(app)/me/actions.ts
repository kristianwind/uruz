"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/auth/session";
import { updateUser } from "@/lib/db/repo/users";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/core";
import type { MediaPref, ModePref, ThemePref } from "@/lib/domain/types";

/** Persist the signed-in user's theme + colour-scheme preferences. */
export async function persistThemePrefs(patch: {
  modePref?: ModePref;
  themePref?: ThemePref;
}): Promise<void> {
  const ctx = await getContext();
  if (!ctx) return;
  updateUser(ctx.user.id, {
    ...(patch.modePref ? { modePref: patch.modePref } : {}),
    ...(patch.themePref ? { themePref: patch.themePref } : {}),
  });
}

/**
 * Persist the language choice. Also mirrored to a cookie so the pre-sign-in
 * pages (login, invite, install) render in the same language.
 */
export async function persistLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  const ctx = await getContext();
  if (ctx) updateUser(ctx.user.id, { localePref: locale });
  revalidatePath("/", "layout");
}

/** Persist whether exercises are shown as illustrations or photographs. */
export async function persistMediaPref(mediaPref: MediaPref): Promise<void> {
  const ctx = await getContext();
  if (!ctx) return;
  updateUser(ctx.user.id, { mediaPref });
  revalidatePath("/", "layout");
}
