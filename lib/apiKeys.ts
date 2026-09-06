"use client";

import { getSupabase } from "./supabase/client";
import { DISPLAY_PREFIX_LENGTH, KEY_PREFIX, hashApiKey } from "./apiKeyFormat";

export interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const COLUMNS = "id, company_id, name, prefix, created_at, last_used_at, revoked_at";

/** 256 bits from the platform CSPRNG, base64url so it survives copy and paste. */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${KEY_PREFIX}${encoded}`;
}

/**
 * Mints a key and stores only its hash.
 *
 * The plaintext is returned to the caller once and never written down. That is
 * a deliberate constraint, not an oversight: a key the database could reveal is
 * a key an attacker with read access could steal.
 */
export async function createApiKey(
  companyId: string,
  createdBy: string,
  name: string,
): Promise<{ key: string; row: ApiKey }> {
  const key = generateApiKey();
  const { data, error } = await getSupabase()
    .from("api_keys")
    .insert({
      company_id: companyId,
      name: name.trim(),
      prefix: key.slice(0, DISPLAY_PREFIX_LENGTH),
      key_hash: await hashApiKey(key),
      created_by: createdBy,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return { key, row: data as ApiKey };
}

export async function fetchApiKeys(companyId: string): Promise<ApiKey[]> {
  const { data, error } = await getSupabase()
    .from("api_keys")
    .select(COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApiKey[];
}

/**
 * Revoked rather than deleted, so the audit trail survives: which key was
 * live, when it was last used, and when someone turned it off.
 */
export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
