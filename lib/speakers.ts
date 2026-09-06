import type { DialogSegment, TalkRatio } from "./types";

export type SpeakerRole = "seller" | "client";

export interface SpeakerMap {
  /** Diarization label the salesperson was given, if we could work it out. */
  sellerLabel: string | null;
  /** Whole-percent split, always summing to 100 when it is known at all. */
  ratio: { seller: number; client: number } | null;
  roleOf: (label: string | null | undefined) => SpeakerRole;
}

/**
 * The diarizer hands back anonymous labels (SPEAKER_00, SPEAKER_01, ...) with
 * no notion of who is selling. The product convention is simple and holds for
 * outbound sales calls: **whoever speaks first is the salesperson.** Everyone
 * else in the recording is the client side.
 *
 * This is the single place that convention is encoded. Resolve once per call
 * and pass the result down — never re-derive it, and never render a raw label.
 */
export function resolveSpeakers(
  dialog: DialogSegment[] | null | undefined,
  talkRatio?: TalkRatio | null,
): SpeakerMap {
  const segments = dialog ?? [];
  let sellerLabel: string | null = null;

  if (segments.length > 0) {
    // `dialog` arrives ordered by time, but a defensive min avoids trusting it.
    let earliest = segments[0];
    for (const s of segments) {
      if (typeof s?.start === "number" && s.start < earliest.start) earliest = s;
    }
    sellerLabel = earliest?.speaker ?? null;
  } else if (talkRatio) {
    // No dialog to read: fall back to label order, which the backend assigns
    // in first-appearance order anyway.
    const labels = Object.keys(talkRatio).sort();
    sellerLabel = labels[0] ?? null;
  }

  const roleOf = (label: string | null | undefined): SpeakerRole =>
    sellerLabel != null && label === sellerLabel ? "seller" : "client";

  return { sellerLabel, ratio: computeRatio(segments, talkRatio, sellerLabel), roleOf };
}

function computeRatio(
  segments: DialogSegment[],
  talkRatio: TalkRatio | null | undefined,
  sellerLabel: string | null,
): { seller: number; client: number } | null {
  if (sellerLabel == null) return null;

  // Prefer the backend's own numbers so the UI never disagrees with the API.
  if (talkRatio && Object.keys(talkRatio).length > 0) {
    let seller = 0;
    let total = 0;
    for (const [label, value] of Object.entries(talkRatio)) {
      const n = Number(value);
      if (!Number.isFinite(n)) continue;
      total += n;
      if (label === sellerLabel) seller += n;
    }
    if (total > 0) {
      const pct = Math.round((seller / total) * 100);
      return { seller: pct, client: 100 - pct };
    }
  }

  // Otherwise measure it off the segments themselves.
  if (segments.length > 0) {
    let seller = 0;
    let total = 0;
    for (const s of segments) {
      const span = Math.max(0, (s.end ?? 0) - (s.start ?? 0));
      total += span;
      if (s.speaker === sellerLabel) seller += span;
    }
    if (total > 0) {
      const pct = Math.round((seller / total) * 100);
      return { seller: pct, client: 100 - pct };
    }
  }

  return null;
}

/**
 * Talk ratio alone, for screens that never load the dialog (the seller list).
 * Same convention: the lowest-sorting label is the salesperson.
 */
export function ratioFromTalkRatio(
  talkRatio: TalkRatio | null | undefined,
): { seller: number; client: number } | null {
  if (!talkRatio) return null;
  const labels = Object.keys(talkRatio).sort();
  if (labels.length === 0) return null;
  return resolveSpeakers(null, talkRatio).ratio;
}

/**
 * Two synthetic segments standing in for an averaged conversation, so the
 * seller table can reuse the real Ribbon rather than a second bar component.
 */
export function ratioAsSegments(
  ratio: { seller: number; client: number },
): DialogSegment[] {
  const seller = Math.max(0, Math.min(100, ratio.seller));
  return [
    { vaqt: "00:00", start: 0, end: seller, speaker: "seller", text: "" },
    { vaqt: "00:00", start: seller, end: 100, speaker: "client", text: "" },
  ];
}
