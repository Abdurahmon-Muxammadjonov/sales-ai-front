import { getSupabase } from "./supabase/client";
import type {
  Analysis,
  Call,
  CallRow,
  CallStatus,
  DialogSegment,
  Seller,
  SellerStats,
  TalkRatio,
  Transcript,
} from "./types";

export const CALLS_PAGE_SIZE = 50;

const CALL_COLUMNS =
  "id, company_id, seller_id, audio_path, duration_sec, status, error, client_name, called_at, created_at, updated_at";

export async function fetchSellers(companyId: string): Promise<Seller[]> {
  const { data, error } = await getSupabase()
    .from("sellers")
    .select("id, company_id, full_name, phone, active, created_at")
    .eq("company_id", companyId)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Seller[];
}

export interface CallsQuery {
  companyId: string;
  sellerId?: string | null;
  status?: CallStatus | null;
  offset?: number;
  limit?: number;
}

export async function fetchCalls(query: CallsQuery): Promise<Call[]> {
  const limit = query.limit ?? CALLS_PAGE_SIZE;
  const offset = query.offset ?? 0;

  let request = getSupabase()
    .from("calls")
    .select(CALL_COLUMNS)
    .eq("company_id", query.companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query.sellerId) request = request.eq("seller_id", query.sellerId);
  if (query.status) request = request.eq("status", query.status);

  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as Call[];
}

export async function fetchCall(id: string): Promise<Call | null> {
  const { data, error } = await getSupabase()
    .from("calls")
    .select(CALL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Call | null) ?? null;
}

export interface RibbonSource {
  dialog: DialogSegment[] | null;
  talk_ratio: TalkRatio | null;
}

/**
 * Just enough of each transcript to draw a ribbon. `full_text` is deliberately
 * left behind — the list would otherwise pull a novel per row.
 */
export async function fetchRibbonSources(
  callIds: string[],
): Promise<Map<string, RibbonSource>> {
  const result = new Map<string, RibbonSource>();
  if (callIds.length === 0) return result;

  const { data, error } = await getSupabase()
    .from("transcripts")
    .select("call_id, dialog, talk_ratio")
    .in("call_id", callIds);
  if (error) throw error;

  for (const row of (data ?? []) as Array<
    { call_id: string } & RibbonSource
  >) {
    result.set(row.call_id, { dialog: row.dialog, talk_ratio: row.talk_ratio });
  }
  return result;
}

export async function fetchTranscript(callId: string): Promise<Transcript | null> {
  const { data, error } = await getSupabase()
    .from("transcripts")
    .select("call_id, dialog, full_text, words_count, talk_ratio, stt_sec, created_at")
    .eq("call_id", callId)
    .maybeSingle();
  if (error) throw error;
  return (data as Transcript | null) ?? null;
}

export async function fetchAnalysis(callId: string): Promise<Analysis | null> {
  const { data, error } = await getSupabase()
    .from("analyses")
    .select(
      "call_id, situation, problem, implication, need_payoff, total_score, strengths, mistakes, missed, recommendations, raw, model, created_at",
    )
    .eq("call_id", callId)
    .maybeSingle();
  // A company with the SPIN step switched off simply has no row here.
  if (error) return null;
  return (data as Analysis | null) ?? null;
}

export async function fetchSellerStats(companyId: string): Promise<SellerStats[]> {
  const { data, error } = await getSupabase()
    .from("seller_stats")
    .select(
      "seller_id, company_id, full_name, calls_count, avg_score, avg_situation, avg_problem, avg_implication, avg_need_payoff, total_hours",
    )
    .eq("company_id", companyId);
  if (error) throw error;
  return (data ?? []) as SellerStats[];
}

/** Signed URL for the private `call-audio` bucket. One hour is plenty. */
export async function signAudioUrl(audioPath: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from("call-audio")
    .createSignedUrl(audioPath, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Merges calls, seller names and ribbon sources into what the list renders. */
export function toCallRows(
  calls: Call[],
  sellerNames: Map<string, string>,
  ribbons: Map<string, RibbonSource>,
): CallRow[] {
  return calls.map((call) => {
    const ribbon = ribbons.get(call.id);
    return {
      ...call,
      seller_name: call.seller_id ? (sellerNames.get(call.seller_id) ?? null) : null,
      dialog: ribbon?.dialog ?? null,
      talk_ratio: ribbon?.talk_ratio ?? null,
    };
  });
}

/**
 * Recent finished calls, trimmed to the two columns the seller screens need.
 * Capped because a busy company has thousands and the averages barely move
 * past the first few hundred.
 */
export const SELLER_SAMPLE_LIMIT = 500;

export async function fetchDoneCallsForCompany(
  companyId: string,
  limit = SELLER_SAMPLE_LIMIT,
): Promise<Array<Pick<Call, "id" | "seller_id" | "created_at" | "called_at">>> {
  const { data, error } = await getSupabase()
    .from("calls")
    .select("id, seller_id, created_at, called_at")
    .eq("company_id", companyId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<Pick<Call, "id" | "seller_id" | "created_at" | "called_at">>;
}

export async function fetchTalkRatios(
  callIds: string[],
): Promise<Map<string, TalkRatio | null>> {
  const result = new Map<string, TalkRatio | null>();
  if (callIds.length === 0) return result;

  // Chunked: `in` lists get unwieldy — and rejected — past a few hundred ids.
  for (let index = 0; index < callIds.length; index += 200) {
    const chunk = callIds.slice(index, index + 200);
    const { data, error } = await getSupabase()
      .from("transcripts")
      .select("call_id, talk_ratio")
      .in("call_id", chunk);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ call_id: string; talk_ratio: TalkRatio | null }>) {
      result.set(row.call_id, row.talk_ratio);
    }
  }
  return result;
}

export async function fetchScoresFor(
  callIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (callIds.length === 0) return result;

  for (let index = 0; index < callIds.length; index += 200) {
    const chunk = callIds.slice(index, index + 200);
    const { data, error } = await getSupabase()
      .from("analyses")
      .select("call_id, total_score")
      .in("call_id", chunk);
    if (error) return result;
    for (const row of (data ?? []) as Array<{ call_id: string; total_score: number | null }>) {
      if (row.total_score != null) result.set(row.call_id, Number(row.total_score));
    }
  }
  return result;
}

export async function fetchSeller(sellerId: string): Promise<Seller | null> {
  const { data, error } = await getSupabase()
    .from("sellers")
    .select("id, company_id, full_name, phone, active, created_at")
    .eq("id", sellerId)
    .maybeSingle();
  if (error) throw error;
  return (data as Seller | null) ?? null;
}

export async function createSeller(
  companyId: string,
  fullName: string,
  phone: string | null,
): Promise<Seller> {
  const { data, error } = await getSupabase()
    .from("sellers")
    .insert({ company_id: companyId, full_name: fullName, phone, active: true })
    .select("id, company_id, full_name, phone, active, created_at")
    .single();
  if (error) throw error;
  return data as Seller;
}

export async function updateSeller(
  sellerId: string,
  patch: Partial<Pick<Seller, "full_name" | "phone" | "active">>,
): Promise<void> {
  const { error } = await getSupabase().from("sellers").update(patch).eq("id", sellerId);
  if (error) throw error;
}

/**
 * Creates a company and makes the caller its owner, in one server-side step.
 *
 * Deliberately an RPC rather than an insert plus an update from the client. To
 * do it client-side the anon role would need INSERT on `companies` and UPDATE
 * on `profiles` — and an UPDATE policy broad enough to let someone set their
 * own `company_id` also lets them set it to *any* company id and walk into
 * another business's calls. The function runs as its definer and refuses
 * anyone who already belongs to a company, so neither hole is opened.
 */
export async function createCompanyForCurrentUser(name: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("create_company_for_current_user", {
    company_name: name,
  });
  if (error) throw error;
  return data as string;
}
