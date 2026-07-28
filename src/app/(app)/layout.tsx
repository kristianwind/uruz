import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/BottomNav";
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
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col">
        <OfflineBanner />
        <main id="main" className="flex-1 px-4 pb-24 pt-2">
          {children}
        </main>
        <BottomNav />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </div>
    </I18nProvider>
  );
}
