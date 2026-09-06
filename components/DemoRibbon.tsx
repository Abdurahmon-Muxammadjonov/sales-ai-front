"use client";

import { useTranslations } from "next-intl";
import { Ribbon, type RibbonSegment } from "./Ribbon";
import { VoiceLegend } from "./VoiceLegend";

/**
 * A real ten-minute call, frozen into a constant so the sign-in hero shows the
 * product's whole idea before anyone has an account: the salesperson holds the
 * floor for 71% of the conversation, and the bar is visibly mostly red.
 */
const DEMO: RibbonSegment[] = (
  [
    [2.4, 14.7, 0], [16.4, 27.1, 1], [28.3, 51, 0], [51.7, 64.9, 0],
    [65.7, 79.4, 0], [80.7, 89.6, 1], [91.2, 102.6, 1], [103.2, 115.2, 1],
    [116.5, 136, 0], [136.5, 142.7, 1], [143.2, 166.8, 0], [167.2, 175.5, 1],
    [176.1, 181.3, 1], [183.1, 187.9, 1], [188.3, 215.9, 0], [216.7, 220.7, 1],
    [222, 227.3, 1], [228.5, 245.7, 0], [246.1, 253.7, 1], [255.2, 281.9, 0],
    [282.3, 288.8, 1], [289.9, 304.1, 0], [305.8, 332.8, 0], [333.9, 336.4, 1],
    [337, 350.4, 0], [350.7, 362.6, 1], [363.5, 382, 0], [383.3, 410.1, 0],
    [411.6, 435, 0], [436.6, 440.8, 1], [441.2, 469.7, 0], [470.5, 475.9, 1],
    [477.5, 481.2, 1], [481.5, 486.1, 1], [486.4, 517.3, 0], [519.1, 531.5, 0],
    [532.9, 535.7, 1], [536.6, 544.2, 1], [545.3, 549.1, 1], [550.7, 560.5, 1],
    [561.7, 582.8, 0], [584.5, 596.4, 1],
  ] as const
).map(([start, end, who]) => ({
  start,
  end,
  speaker: who === 0 ? "SPEAKER_00" : "SPEAKER_01",
}));

const DEMO_RATIO = { seller: 71, client: 29 };

export function DemoRibbon() {
  const t = useTranslations("auth");

  return (
    <div>
      <Ribbon
        segments={DEMO}
        duration={600}
        roleOf={(speaker) => (speaker === "SPEAKER_00" ? "seller" : "client")}
        size="hero"
        ratio={DEMO_RATIO}
      />
      <VoiceLegend
        ratio={DEMO_RATIO}
        className="mt-4"
        trailing={<span className="text-ink-3">{t("demoCaption")}</span>}
      />
    </div>
  );
}

export default DemoRibbon;
