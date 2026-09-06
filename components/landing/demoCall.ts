import type { Analysis, DialogSegment } from "@/lib/types";

/**
 * The illustrative call used on the marketing page.
 *
 * It is the sample payload from the product brief, not a customer's recording,
 * and it is never presented as one. Everything drawn from it is rendered by the
 * same components the app uses, so what a visitor sees on the landing page is
 * literally the product's own output — it cannot drift out of date the way a
 * screenshot would.
 */
const SHAPE: Array<[number, number, 0 | 1]> = [
  [2.4, 14.7, 0], [16.4, 27.1, 1], [28.3, 51, 0], [51.7, 64.9, 0], [65.7, 79.4, 0],
  [80.7, 89.6, 1], [91.2, 102.6, 1], [103.2, 115.2, 1], [116.5, 136, 0], [136.5, 142.7, 1],
  [143.2, 166.8, 0], [167.2, 175.5, 1], [176.1, 181.3, 1], [183.1, 187.9, 1], [188.3, 215.9, 0],
  [216.7, 220.7, 1], [222, 227.3, 1], [228.5, 245.7, 0], [246.1, 253.7, 1], [255.2, 281.9, 0],
  [282.3, 288.8, 1], [289.9, 304.1, 0], [305.8, 332.8, 0], [333.9, 336.4, 1], [337, 350.4, 0],
  [350.7, 362.6, 1], [363.5, 382, 0], [383.3, 410.1, 0], [411.6, 435, 0], [436.6, 440.8, 1],
  [441.2, 469.7, 0], [470.5, 475.9, 1], [477.5, 481.2, 1], [481.5, 486.1, 1], [486.4, 517.3, 0],
  [519.1, 531.5, 0], [532.9, 535.7, 1], [536.6, 544.2, 1], [545.3, 549.1, 1], [550.7, 560.5, 1],
  [561.7, 582.8, 0], [584.5, 596.4, 1],
];

export const DEMO_DURATION = 600;
export const DEMO_RATIO = { seller: 71, client: 29 };

export const DEMO_SEGMENTS: DialogSegment[] = SHAPE.map(([start, end, who]) => ({
  vaqt: "00:00",
  start,
  end,
  speaker: who === 0 ? "SPEAKER_00" : "SPEAKER_01",
  text: "",
}));

export const demoRoleOf = (speaker: string) =>
  speaker === "SPEAKER_00" ? ("seller" as const) : ("client" as const);

export const DEMO_TURNS: DialogSegment[] = [
  {
    vaqt: "00:12",
    start: 12.78,
    end: 29.75,
    speaker: "SPEAKER_00",
    text: "alo, assalomu alaykum. jahongir aka yaxshimisiz? ismim shaxlot, shaxsiy brend qurish boʻyicha yordamchi boʻlaman.",
  },
  { vaqt: "00:30", start: 30.71, end: 32.31, speaker: "SPEAKER_01", text: "ha, ha. hozir u." },
  {
    vaqt: "00:38",
    start: 38.9,
    end: 53.82,
    speaker: "SPEAKER_01",
    text: "kurs boʻyicha maʼlumot olmoqchi edim. bizni sohaga ham toʻgʻri keladimi? necha oy davom etadi?",
  },
  {
    vaqt: "01:07",
    start: 67.91,
    end: 72.65,
    speaker: "SPEAKER_01",
    text: "bularniki mebel va asra ishlab chiqarish sexi.",
  },
];

export const DEMO_ANALYSIS: Analysis = {
  call_id: "demo",
  situation: 7,
  problem: 7,
  implication: 3,
  need_payoff: 4,
  total_score: 5,
  strengths: [
    "Mijozning sohasi va lavozimini aniq ajratib oldi",
    "Sohaga mos misol keltirdi",
  ],
  mistakes: [
    "Oqibat savollari oʻrniga uzun monolog aytdi",
    "Taqdimot qismida mijozdan teskari aloqa olinmadi",
  ],
  missed: [
    {
      vaqt: "07:31",
      nima: "Mijoz 100–200 ming soʻm uchun xaridorlar ketib qolayotganini aytdi. Shu joyda oyiga qancha yoʻqotayotganini soʻrash kerak edi.",
    },
    { vaqt: "26:01", nima: "Mijoz ertaga toʻlayman deganda oldindan bron soʻralmadi." },
  ],
  recommendations: [
    "Muammoni eshitgach darhol taqdimotga oʻtmang, oqibat savolini bering",
    "Har 1–2 daqiqada mijozdan tasdiq oling",
  ],
  raw: null,
  model: "demo",
  created_at: "2026-09-04T17:43:31Z",
};
