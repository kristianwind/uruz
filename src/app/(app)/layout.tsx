import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/BottomNav";
import { SideNav } from "@/components/app/SideNav";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/app/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { I18nProvider } from "@/components/app/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
import { getContext } from "@/lib/auth/session";
import { isFirstRun } from "@/lib/db/repo/halls";

export const dynamic = "force-dynamic";

/**
 * The authenticated app shell: offline banner, scrollable content with room for
 * the fixed bottom nav, and the thumb-friendly tab bar itself. Unauthenticated
 * visitors are routed to first-run setup or sign-in.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (isFirstRun()) redirect("/welcome");
  const ctx = await getContext();
  if (!ctx) redirect("/login");

  const locale = await getLocale(ctx.user.localePref);

  return (
    <I18nProvider locale={locale}>
      {/* Two shells in one. Up to 768px this is the phone it was designed as:
          a 448px column with a thumb-reachable tab bar pinned to the bottom.
          From 768px the rail takes over on the left, the column cap is lifted,
          and the space the tab bar was reserving at the bottom is given back.
          Each page then decides for itself what to do with the extra width. */}
      <SideNav isAdmin={ctx.user.role === "admin"} />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col md:ml-56 md:max-w-none">
        <OfflineBanner />
        {/* A cap on the content even when the window has none: a row of text
            1500px wide is harder to read than one at 400. Pages that want to
            use more of it do so by splitting into columns, not by stretching. */}
        <main id="main" className="flex-1 px-4 pb-24 pt-2 md:mx-auto md:w-full md:max-w-6xl md:px-8 md:pb-10 md:pt-6">
          {children}
        </main>
        <BottomNav />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </div>
    </I18nProvider>
  );
}
