import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { LandingRibbon, LandingSpin, LandingTranscript } from "@/components/landing/Previews";
import { BrowserFrame } from "@/components/landing/BrowserFrame";
import { IconCode, IconMic, IconUpload, IconWave } from "@/components/icons";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <div className="min-h-dvh">
      <PublicHeader />

      {/* ---------------------------------------------------------------- hero */}
      <section className="shell pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-ink sm:text-[48px]">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
            {t("heroSub")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/kirish"
              className="inline-flex h-11 items-center rounded-full bg-accent-fill px-6 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {t("heroCta")}
            </Link>
            <a
              href="#how"
              className="inline-flex h-11 items-center rounded-full border border-line bg-canvas px-6 text-[14px] font-medium text-ink transition-colors hover:bg-hover"
            >
              {t("heroSecondary")}
            </a>
          </div>
        </div>

        {/* The signature bar, rendered by the same component the app uses. */}
        <div className="mx-auto mt-14 max-w-4xl">
          <BrowserFrame label="salespulse.uz — qoʻngʻiroq tahlili">
            <LandingRibbon />
          </BrowserFrame>
          <p className="mx-auto mt-5 max-w-xl text-center text-[14px] leading-relaxed text-ink-2">
            {t("heroInsight")}
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------- how */}
      <section id="how" className="scroll-mt-20 border-t border-line bg-canvas py-16 sm:py-24">
        <div className="shell">
          <SectionHead title={t("howTitle")} sub={t("howSub")} />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            <Step
              n="1"
              icon={<IconUpload />}
              tone="var(--accent)"
              title={t("how1Title")}
              body={t("how1Body")}
            />
            <Step
              n="2"
              icon={<IconWave />}
              tone="var(--teal)"
              title={t("how2Title")}
              body={t("how2Body")}
            />
            <Step
              n="3"
              icon={<IconMic />}
              tone="var(--green)"
              title={t("how3Title")}
              body={t("how3Body")}
            />
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- what */}
      <section id="what" className="scroll-mt-20 border-t border-line py-16 sm:py-24">
        <div className="shell">
          <SectionHead title={t("whatTitle")} sub={t("whatSub")} />

          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="space-y-8">
              <Feature title={t("what2Title")} body={t("what2Body")} />
              <Feature title={t("what3Title")} body={t("what3Body")} />
              <Feature title={t("what4Title")} body={t("what4Body")} />
              <Feature title={t("what1Title")} body={t("what1Body")} />
            </div>

            <div className="space-y-5">
              <BrowserFrame label="SPIN bahosi">
                <LandingSpin />
              </BrowserFrame>
              <BrowserFrame label="Suhbat matni">
                <LandingTranscript />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- api */}
      <section id="api" className="scroll-mt-20 border-t border-line bg-canvas py-16 sm:py-24">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-full"
              style={{
                background: "color-mix(in srgb, var(--indigo) 12%, transparent)",
                color: "var(--indigo)",
              }}
            >
              <IconCode />
            </span>
            <h2 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
              {t("apiTitle")}
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">{t("apiSub")}</p>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-3">{t("apiNote")}</p>
          </div>

          <BrowserFrame label="terminal">
            <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-ink">
{`$ curl -X POST https://salespulse.uz/api/v1/calls \\
    -H "Authorization: Bearer sp_..." \\
    -F "file=@qongiroq.mp3"

  { "id": "7ea8c82a-...", "status": "pending" }

$ curl https://salespulse.uz/api/v1/calls/7ea8c82a-... \\
    -H "Authorization: Bearer sp_..."

  { "call":       { "status": "done", ... },
    "transcript": { "talk_ratio": { "SPEAKER_00": 71,
                                    "SPEAKER_01": 29 }, ... },
    "analysis":   { "total_score": 5, ... } }`}
            </pre>
          </BrowserFrame>
        </div>
      </section>

      {/* ----------------------------------------------------------------- cta */}
      <section className="border-t border-line py-16 sm:py-24">
        <div className="shell text-center">
          <h2 className="mx-auto max-w-2xl text-[26px] font-semibold tracking-[-0.02em] text-balance text-ink sm:text-[34px]">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-2">
            {t("ctaSub")}
          </p>
          <Link
            href="/kirish"
            className="mt-8 inline-flex h-11 items-center rounded-full bg-accent-fill px-7 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t("heroCta")}
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-balance text-ink sm:text-[34px]">
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{sub}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  tone,
  title,
  body,
}: {
  n: string;
  icon: ReactNode;
  tone: string;
  title: string;
  body: string;
}) {
  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full"
        style={{ background: `color-mix(in srgb, ${tone} 12%, transparent)`, color: tone }}
      >
        {icon}
      </span>
      <p className="tnum mt-4 font-mono text-[12px] text-ink-3">{n}</p>
      <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.015em] text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{body}</p>
    </li>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-line pl-5">
      <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}
