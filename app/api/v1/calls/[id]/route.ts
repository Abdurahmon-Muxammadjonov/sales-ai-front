import { authenticateApiKey, jsonError, UNAUTHORIZED } from "@/lib/server/apiAuth";
import { getServerSupabase } from "@/lib/server/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/calls/{id} — status, transcript and analysis for one call.
 *
 * Read straight out of Postgres rather than proxied onward, so the caller sees
 * exactly what the dashboard sees. The lookup is scoped to the key's own
 * company inside the database function, so guessing another company's call id
 * returns the same 404 as a call that does not exist.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (!auth) return UNAUTHORIZED();

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return jsonError(400, "invalid_id", "Call id must be a UUID.");
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return jsonError(503, "not_configured", "Database is not configured.");
  }

  const { data, error } = await supabase.rpc("api_call_result", {
    p_key_hash: auth.keyHash,
    p_call_id: id,
  });

  if (error) {
    return jsonError(502, "lookup_failed", "Could not read the call.");
  }
  if (!data) {
    return jsonError(404, "not_found", "No call with that id for this API key.");
  }

  return Response.json(data);
}
