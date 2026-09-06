"use client";

import { useTranslations } from "next-intl";
import { Ribbon } from "@/components/Ribbon";
import { SpinScores } from "@/components/SpinScores";
import { Transcript } from "@/components/Transcript";
import { VoiceLegend } from "@/components/VoiceLegend";
import {
  DEMO_ANALYSIS,
  DEMO_DURATION,
  DEMO_RATIO,
  DEMO_SEGMENTS,
  DEMO_TURNS,
  demoRoleOf,
} from "./demoCall";

/**
 * The landing page's product imagery. Every one of these is the component the
 * app itself renders, fed illustrative data — so a visitor is looking at the
 * real interface, and it stays correct when the interface changes.
 */

export function LandingRibbon() {
  const t = useTranslations("landing");
  return (
    <div>
      <Ribbon
        segments={DEMO_SEGMENTS}
        duration={DEMO_DURATION}
        roleOf={demoRoleOf}
        ratio={DEMO_RATIO}
        size="hero"
        animate
      />
      <VoiceLegend ratio={DEMO_RATIO} className="mt-4" />
      <p className="mt-3 text-[12px] text-ink-3">{t("heroCaption")}</p>
    </div>
  );
}

export function LandingSpin() {
  return (
    <div className="[&_section]:border-0 [&_section]:pt-0">
      <SpinScores analysis={DEMO_ANALYSIS} />
    </div>
  );
}

export function LandingTranscript() {
  return (
    <div className="[&_[data-turn]]:py-2.5">
      <Transcript
        dialog={DEMO_TURNS}
        roleOf={demoRoleOf}
        activeIndex={-1}
        following={false}
      />
    </div>
  );
}
