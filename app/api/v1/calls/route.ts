import { authenticateApiKey, jsonError, UNAUTHORIZED } from "@/lib/server/apiAuth";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  hasAcceptedExtension,
} from "@/lib/api";

const RAILWAY = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

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
