import type { CallResultResponse, CallStatusResponse } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

/**
 * One list, used by the upload modal, the speech page and the public API route.
 * `webm` is on it because the in-browser recorder produces webm/opus on Chrome
 * and Firefox — verified end to end against the processing service, which
 * accepts and transcribes it.
 */
export const ACCEPTED_AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "m4a",
  "ogg",
  "opus",
  "flac",
  "webm",
  "mp4",
] as const;

export const ACCEPTED_AUDIO_ACCEPT = ACCEPTED_AUDIO_EXTENSIONS.map((e) => `.${e}`).join(",");

export function hasAcceptedExtension(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();
  return !!ext && (ACCEPTED_AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Every failure the UI can describe. Screens switch on `kind` and look up a
 * localised sentence — raw server strings never reach a user.
 */
export type ApiErrorKind =
  | "limit"
  | "not_found"
  | "too_large"
  | "server"
  | "network"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Monthly hour allowance, when the 402 body tells us what it is. */
  readonly limit: number | null;

  constructor(kind: ApiErrorKind, status: number, limit: number | null = null) {
    super(`api-${kind}-${status}`);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.limit = limit;
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 402) return "limit";
  if (status === 404) return "not_found";
  if (status === 413) return "too_large";
  if (status >= 500) return "server";
  return "unknown";
}

/**
 * The API trusts `company_id` in the body today and verifies no token. The
 * session provider already registers a token source, so turning JWT auth on is
 * a deploy-time flag rather than a code change — the header is built here and
 * nowhere else. It stays off by default because sending `Authorization` to an
 * endpoint whose CORS policy does not list it would fail every request.
 */
const SEND_AUTH_HEADER = process.env.NEXT_PUBLIC_API_AUTH === "1";

let getAccessToken: (() => Promise<string | null>) | null = null;

export function setAccessTokenProvider(fn: () => Promise<string | null>) {
  getAccessToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!SEND_AUTH_HEADER || !getAccessToken) return {};
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function requireBase(): string {
  if (!BASE) throw new ApiError("unknown", 0);
  return BASE;
}

async function readLimit(res: Response): Promise<number | null> {
  try {
    const body = (await res.clone().json()) as Record<string, unknown>;
    for (const key of ["hours_limit", "limit", "hoursLimit"]) {
      const value = Number(body?.[key]);
      if (Number.isFinite(value)) return value;
    }
  } catch {
    /* a non-JSON error body is fine — we just have no number to show */
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${requireBase()}${path}`, {
      ...init,
      headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("network", 0);
  }

  if (!res.ok) {
    const limit = res.status === 402 ? await readLimit(res) : null;
    throw new ApiError(kindForStatus(res.status), res.status, limit);
  }

  return (await res.json()) as T;
}

export interface UploadInput {
  file: File;
  companyId: string;
  sellerId?: string | null;
  clientName?: string | null;
  /** Off means `speakers: 0` — faster, but no talk ratio comes back. */
  diarize: boolean;
}

/**
 * POST /calls — multipart upload that starts processing.
 *
 * Uses XHR rather than fetch purely because upload progress events are the
 * only honest way to show a 200 MB file moving.
 */
export function uploadCall(
  input: UploadInput,
  opts: {
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<CallStatusResponse> {
  return new Promise((resolve, reject) => {
    if (input.file.size > MAX_UPLOAD_BYTES) {
      reject(new ApiError("too_large", 413));
      return;
    }

    let base: string;
    try {
      base = requireBase();
    } catch (error) {
      reject(error);
      return;
    }

    const form = new FormData();
    form.append("file", input.file);
    form.append("company_id", input.companyId);
    if (input.sellerId) form.append("seller_id", input.sellerId);
    if (input.clientName?.trim()) form.append("client_name", input.clientName.trim());
    form.append("speakers", input.diarize ? "2" : "0");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/calls`);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && opts.onProgress) {
        opts.onProgress(event.loaded / event.total);
      }
    };

    xhr.onerror = () => reject(new ApiError("network", 0));
    xhr.ontimeout = () => reject(new ApiError("network", 0));
    xhr.onabort = () => reject(new ApiError("network", 0));

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CallStatusResponse);
        } catch {
          reject(new ApiError("unknown", xhr.status));
        }
        return;
      }
      let limit: number | null = null;
      if (xhr.status === 402) {
        try {
          const body = JSON.parse(xhr.responseText) as Record<string, unknown>;
          for (const key of ["hours_limit", "limit", "hoursLimit"]) {
            const value = Number(body?.[key]);
            if (Number.isFinite(value)) {
              limit = value;
              break;
            }
          }
        } catch {
          /* no number available */
        }
      }
      reject(new ApiError(kindForStatus(xhr.status), xhr.status, limit));
    };

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    void authHeaders().then((headers) => {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
      xhr.send(form);
    });
  });
}

/** GET /calls/{id} — the cheap status poll. */
export function getCallStatus(id: string): Promise<CallStatusResponse> {
  return request<CallStatusResponse>(`/calls/${encodeURIComponent(id)}`);
}

/** GET /calls/{id}/result — call, transcript and (optionally) analysis. */
export function getCallResult(id: string): Promise<CallResultResponse> {
  return request<CallResultResponse>(`/calls/${encodeURIComponent(id)}/result`);
}

/** POST /calls/{id}/retry — re-runs a failed call. */
export function retryCall(id: string): Promise<CallStatusResponse> {
  return request<CallStatusResponse>(`/calls/${encodeURIComponent(id)}/retry`, {
    method: "POST",
  });
}

/** Maps an unknown throwable onto the error vocabulary the UI speaks. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError("unknown", 0);
}
