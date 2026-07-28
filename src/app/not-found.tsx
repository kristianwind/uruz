import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-4xl text-accent">ᚢ</span>
      <h1 className="text-xl font-bold">{t("errors.notFound")}</h1>
      <Link href="/train" className="mt-2 text-accent underline">
        {t("nav.train")}
      </Link>
    </main>
  );
}
