import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/app/I18nProvider";
import { getLocale } from "@/lib/i18n/server";
import { createT } from "@/lib/i18n/core";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Uruz",
  title: {
    default: "Uruz ᚢ",
    template: "%s · Uruz",
  },
  // Static, so it cannot follow the signed-in user — it is what a stranger
  // and a link preview see, which is the same audience the default is for.
  description: "Build strength, one rune at a time.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Uruz",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1016",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/**
 * Set the color scheme + flavor on <html> before first paint to avoid a
 * flash of the wrong theme. Persisted server-side per user, mirrored to
 * localStorage for instant application on the client.
 */
const themeInit = `
(function () {
  try {
    var mode = localStorage.getItem('uruz-mode') || 'dark';
    var theme = localStorage.getItem('uruz-theme') || 'norse';
    var el = document.documentElement;
    el.setAttribute('data-mode', mode);
    el.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-mode', 'dark');
    document.documentElement.setAttribute('data-theme', 'norse');
  }
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale from the cookie here; the authenticated shell overrides it with the
  // signed-in user's saved preference via a nested provider.
  const locale = await getLocale();
  const t = createT(locale);
  return (
    <html lang={locale} data-mode="dark" data-theme="norse" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
        >
          {t("common.continue")}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
