"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { IconCall, IconCode, IconMic, IconSpeaker, IconWave } from "@/components/icons";

export default function SpeechHomePage() {
  const t = useTranslations("speech");
  const tNav = useTranslations("nav");

  return (
    <div className="py-6 sm:py-8">
      <Hero />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <FeatureCard
          icon={<IconWave />}
          tone="var(--accent)"
          title={t("sttTitle")}
          body={t("sttBody")}
          cta={t("sttCta")}
          href="/speech/stt"
        />
        <FeatureCard
          icon={<IconSpeaker />}
          tone="var(--purple)"
          title={t("ttsTitle")}
          body={t("ttsBody")}
          cta={tNav("comingSoon")}
        />
        <FeatureCard
          icon={<IconCode />}
          tone="var(--teal)"
          title={t("apiTitle")}
          body={t("apiBody")}
          cta={t("apiCta")}
          href="/settings"
        />
        <FeatureCard
          icon={<IconCall />}
          tone="var(--green)"
          title={t("analysisTitle")}
          body={t("analysisBody")}
          cta={t("analysisCta")}
          href="/calls"
        />
        <FeatureCard
          icon={<IconMic />}
          tone="var(--orange)"
          title={t("assistantTitle")}
          body={t("assistantBody")}
          cta={tNav("comingSoon")}
        />
      </div>
    </div>
  );
}

function Hero() {
  const t = useTranslations("speech");

  return (
    <section
      className="relative overflow-hidden rounded-hero px-6 py-10 sm:px-10 sm:py-14"
      style={{
        background:
          "radial-gradient(120% 140% at 88% 18%, #2a2a2e 0%, #131315 42%, #0a0a0b 100%)",
      }}
    >
      <HeroPattern />

      <div className="relative max-w-2xl">
        <div className="flex items-center gap-2.5">
          <Logo showText={false} size={26} />
          <span className="text-[13px] font-medium tracking-[-0.01em] text-white/70">
            {t("heroEyebrow")}
          </span>
        </div>

        <h2 className="mt-5 text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] text-white text-balance sm:text-[38px]">
          {t("heroTitle")}
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65">
          {t("heroSub")}
        </p>

        <Link
          href="/speech/stt"
          className="mt-7 inline-flex h-10 items-center rounded-full bg-white px-5 text-[14px] font-medium text-[#1d1d1f] transition-transform duration-150 hover:scale-[1.02]"
        >
          {t("heroCta")}
        </Link>
      </div>
    </section>
  );
}

/**
 * The waveform, drawn rather than fetched. Low contrast on purpose: it should
 * read as texture behind the words, not compete with them.
 */
function HeroPattern() {
  const bars = Array.from({ length: 34 }, (_, i) => {
    // Deterministic pseudo-waveform — no randomness, so server and client agree.
    const wave = Math.sin(i * 0.62) * Math.cos(i * 0.23) * 0.5 + 0.5;
    return 12 + wave * 76;
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] items-center justify-end pr-6 md:flex"
    >
      <svg viewBox="0 0 340 120" className="h-full w-full" fill="none" preserveAspectRatio="xMidYMid meet">
        <g>
          {bars.map((height, i) => (
            <rect
              key={i}
              x={i * 10 + 2}
              y={60 - height / 2}
              width="4"
              height={height}
              rx="2"
              fill="var(--red)"
              opacity={0.18 + (height / 88) * 0.5}
            />
          ))}
        </g>
        <g opacity="0.09" stroke="white" strokeWidth="1">
          <path d="M0 30 Q 85 8 170 30 T 340 30" />
          <path d="M0 60 Q 85 34 170 60 T 340 60" />
          <path d="M0 90 Q 85 62 170 90 T 340 90" />
        </g>
      </svg>
    </div>
  );
}

function FeatureCard({
  icon,
  tone,
  title,
  body,
  cta,
  href,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  body: string;
  cta: string;
  href?: string;
}) {
  const disabled = !href;

  return (
    <div
      className={`card flex flex-col p-5 transition-shadow duration-200 ${
        disabled ? "opacity-60" : "hover:shadow-[0_4px_16px_rgba(0,0,0,.06)]"
      }`}
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-full"
        style={{ background: `color-mix(in srgb, ${tone} 12%, transparent)`, color: tone }}
      >
        {icon}
      </span>

      <h3 className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      <div className="my-3 h-px bg-divider" />
      <p className="flex-1 text-[13px] leading-relaxed text-ink-2">{body}</p>

      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent transition-opacity hover:opacity-75"
        >
          {cta}
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="mt-4 inline-flex w-fit cursor-not-allowed items-center rounded-full bg-raised px-2.5 py-1 text-[12px] font-medium text-ink-3">
          {cta}
        </span>
      )}
    </div>
  );
}
