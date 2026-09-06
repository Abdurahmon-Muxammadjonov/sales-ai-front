import { bearerFrom, hashApiKey } from "@/lib/apiKeyFormat";
import { getServerSupabase } from "./supabase";

export interface AuthedKey {
  companyId: string;
  keyHash: string;
}

/**
 * Resolves an incoming API key to the company it belongs to, and records the
 * call. Returns null for anything that is not a live key — a revoked key, a
 * typo and a fabricated key are all the same answer, on purpose.
 */
export async function authenticateApiKey(
  request: Request,
): Promise<AuthedKey | null> {
  const token = bearerFrom(request.headers.get("authorization"));
  if (!token) return null;

  const supabase = getServerSupabase();
  if (!supabase) return null;

  const keyHash = await hashApiKey(token);
  const { data, error } = await supabase.rpc("company_for_api_key", {
    p_key_hash: keyHash,
  });
  if (error || !data) return null;

  return { companyId: data as string, keyHash };
}

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export const UNAUTHORIZED = () =>
  jsonError(
    401,
    "invalid_api_key",
    "Provide a live API key as: Authorization: Bearer sp_…",
  );
