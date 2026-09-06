import { authenticateApiKey, jsonError, UNAUTHORIZED } from "@/lib/server/apiAuth";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  hasAcceptedExtension,
} from "@/lib/api";

const RAILWAY = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/**
 * Serverless platforms cap the request body they will hand to a function —
 * 4.5 MB on Vercel — and they reject the request before this code runs. The
 * file is proxied rather than sent straight to the processing service because
 * that service trusts whatever `company_id` it is given: letting a caller post
 * directly would let them file recordings into, and read them back out of, any
 * company whose id they could guess. The proxy is what makes the API key mean
 * something, and this ceiling is the price of it.
 *
 * The dashboard's own uploader is unaffected — it posts from the browser
 * straight to the processing service, so it keeps the full 200 MB.
 */
const MAX_PROXY_BYTES = 4 * 1024 * 1024;

/** Forwarding a multi-megabyte file takes longer than the 10s default. */
export const maxDuration = 60;

/**
 * POST /api/v1/calls — submit a recording for processing.
 *
 * The customer's own backend calls this with their API key. The key decides
 * which company the call belongs to, which is why `company_id` is not a field
 * a caller can set: doing so would let anyone file recordings into, and then
 * read them back out of, someone else's account.
 *
 * Processing is asynchronous. This returns a call id straight away; the
 * transcript is fetched from GET /api/v1/calls/{id} once the status is "done".
 */
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return UNAUTHORIZED();

  if (!RAILWAY) {
    return jsonError(503, "not_configured", "Processing API is not configured.");
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return jsonError(
      400,
      "invalid_body",
      "Send multipart/form-data with a `file` field.",
    );
  }

  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "file_missing", "A `file` field with the audio is required.");
  }
  if (!hasAcceptedExtension(file.name)) {
    return jsonError(
      415,
      "unsupported_format",
      `Audio must be one of: ${ACCEPTED_AUDIO_EXTENSIONS.join(", ")}.`,
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(413, "file_too_large", "Audio must be 200 MB or smaller.");
  }
  if (file.size > MAX_PROXY_BYTES) {
    return jsonError(
      413,
      "file_too_large_for_api",
      `Files sent through this endpoint must be ${Math.round(
        MAX_PROXY_BYTES / 1024 / 1024,
      )} MB or smaller. Larger recordings can be uploaded from the dashboard, which does not proxy them.`,
    );
  }

  const outgoing = new FormData();
  outgoing.append("file", file, file.name);
  outgoing.append("company_id", auth.companyId);

  const sellerId = incoming.get("seller_id");
  if (typeof sellerId === "string" && sellerId.trim()) {
    outgoing.append("seller_id", sellerId.trim());
  }
  const clientName = incoming.get("client_name");
  if (typeof clientName === "string" && clientName.trim()) {
    outgoing.append("client_name", clientName.trim());
  }
  // Anything but an explicit 0 keeps diarization on, so the talk ratio is
  // there by default rather than silently missing.
  const speakers = incoming.get("speakers");
  outgoing.append("speakers", String(speakers) === "0" ? "0" : "2");

  let response: Response;
  try {
    response = await fetch(`${RAILWAY}/calls`, { method: "POST", body: outgoing });
  } catch {
    return jsonError(502, "upstream_unreachable", "Could not reach the processing service.");
  }

  const body = await response.text();

  if (!response.ok) {
    if (response.status === 402) {
      return jsonError(402, "quota_exceeded", "The monthly hour limit for this company is used up.");
    }
    if (response.status === 413) {
      return jsonError(413, "file_too_large", "Audio must be 200 MB or smaller.");
    }
    return jsonError(502, "upstream_error", "The processing service rejected the recording.");
  }

  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
