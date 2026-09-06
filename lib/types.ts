export type CallStatus =
  | "pending"
  | "transcribing"
  | "analyzing"
  | "done"
  | "failed";

export const CALL_STATUSES: CallStatus[] = [
  "pending",
  "transcribing",
  "analyzing",
  "done",
  "failed",
];

export const SETTLED_STATUSES: CallStatus[] = ["done", "failed"];

export function isSettled(status: string): boolean {
  return status === "done" || status === "failed";
}

export type Tariff = "start" | "pro" | "enterprise";
export type ProfileRole = "owner" | "manager" | "viewer";

export interface Company {
  id: string;
  name: string;
  tariff: Tariff;
  hours_limit: number;
  hours_used: number;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
}

export interface Seller {
  id: string;
  company_id: string;
  full_name: string;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export interface Call {
  id: string;
  company_id: string;
  seller_id: string | null;
  audio_path: string | null;
  duration_sec: number | null;
  status: CallStatus;
  error: string | null;
  client_name: string | null;
  called_at: string | null;
  created_at: string;
  updated_at: string;
}

/** One turn of the conversation, as stored in `transcripts.dialog`. */
export interface DialogSegment {
  /** Pre-formatted mm:ss from the backend. Display only — never sorted on. */
  vaqt: string;
  start: number;
  end: number;
  /** Anonymous diarization label, e.g. "SPEAKER_00". Never shown to a user. */
  speaker: string;
  text: string;
}

export type TalkRatio = Record<string, number>;

export interface Transcript {
  call_id: string;
  dialog: DialogSegment[] | null;
  full_text: string | null;
  words_count: number | null;
  talk_ratio: TalkRatio | null;
  stt_sec: number | null;
  created_at: string;
}

export interface MissedOpportunity {
  vaqt: string;
  nima: string;
}

export interface Analysis {
  call_id: string;
  situation: number;
  problem: number;
  implication: number;
  need_payoff: number;
  total_score: number;
  strengths: string[] | null;
  mistakes: string[] | null;
  missed: MissedOpportunity[] | null;
  recommendations: string[] | null;
  raw: unknown;
  model: string | null;
  created_at: string;
}

export interface SellerStats {
  seller_id: string;
  company_id: string;
  full_name: string;
  calls_count: number;
  avg_score: number | null;
  avg_situation: number | null;
  avg_problem: number | null;
  avg_implication: number | null;
  avg_need_payoff: number | null;
  total_hours: number | null;
}

/** Shape returned by `GET /calls/{id}` and `POST /calls`. */
export interface CallStatusResponse {
  id: string;
  status: CallStatus;
  duration_sec: number | null;
  error: string | null;
}

/** Shape returned by `GET /calls/{id}/result`. */
export interface CallResultResponse {
  call: Partial<Call> & { id: string; status: CallStatus };
  transcript: Partial<Transcript> | null;
  analysis: Partial<Analysis> | null;
}

/** A call row plus everything the list needs to draw it. */
export interface CallRow extends Call {
  seller_name: string | null;
  talk_ratio: TalkRatio | null;
  dialog: DialogSegment[] | null;
}

export const SPIN_AXES = [
  "situation",
  "problem",
  "implication",
  "need_payoff",
] as const;

export type SpinAxis = (typeof SPIN_AXES)[number];
