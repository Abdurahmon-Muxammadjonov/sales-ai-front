import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/Wordmark";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-md">
        <Wordmark className="text-lg" />
        <h1 className="font-display mt-6 text-xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-ink-2">{t("body")}</p>
        <Link
          href="/calls"
          className="mt-6 inline-flex h-9 items-center rounded-control bg-ink px-3.5 text-sm font-medium text-canvas hover:opacity-90"
        >
          {t("action")}
        </Link>
      </div>
    </main>
  );
}
