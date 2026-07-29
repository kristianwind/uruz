import { localizedTitle } from "@/lib/i18n/metadata";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { getT } from "@/lib/i18n/server";

export const generateMetadata = localizedTitle("titles.installTitle");

function Steps({ heading, steps }: { heading: string; steps: string[] }) {
  return (
    <Card className="mb-4">
      <h2 className="mb-3 font-semibold text-text">{heading}</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {i + 1}
            </span>
            <span className="text-sm text-muted">{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default async function InstallPage() {
  const t = await getT();
  return (
    <main className="mx-auto min-h-dvh max-w-md p-4">
      <Link href="/me" className="mb-2 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeftIcon size={16} /> {t("nav.me")}
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-accent">ᚢ {t("install.title")}</h1>
      <p className="mb-6 text-sm text-muted">{t("app.tagline")}</p>

      <Steps heading={t("install.iphoneTitle")} steps={t.list("install.iphone")} />
      <Steps heading={t("install.desktopTitle")} steps={t.list("install.desktop")} />
    </main>
  );
}
