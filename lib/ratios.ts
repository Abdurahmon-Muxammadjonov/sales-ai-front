import { ratioFromTalkRatio } from "./speakers";
import type { TalkRatio } from "./types";

/**
 * Average talk ratio per seller across their finished calls, so a manager can
 * see at a glance that one person always holds the floor.
 */
export function averageRatiosBySeller(
  calls: Array<{ id: string; seller_id: string | null }>,
  talkRatios: Map<string, TalkRatio | null>,
): Map<string, { seller: number; client: number }> {
  const totals = new Map<string, { sum: number; count: number }>();

  for (const call of calls) {
    if (!call.seller_id) continue;
    const ratio = ratioFromTalkRatio(talkRatios.get(call.id) ?? null);
    if (!ratio) continue;
    const entry = totals.get(call.seller_id) ?? { sum: 0, count: 0 };
    entry.sum += ratio.seller;
    entry.count += 1;
    totals.set(call.seller_id, entry);
  }

  const result = new Map<string, { seller: number; client: number }>();
  for (const [sellerId, entry] of totals) {
    if (entry.count === 0) continue;
    const seller = Math.round(entry.sum / entry.count);
    result.set(sellerId, { seller, client: 100 - seller });
  }
  return result;
}
