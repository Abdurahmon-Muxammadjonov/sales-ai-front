import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client for the public API routes.
 *
 * Still the anon key, deliberately. The two functions these routes call are
 * SECURITY DEFINER and authenticate the caller by key hash themselves, so the
 * gateway needs no elevated credential — which means there is no service key
 * to leak from the deployment, and a mistake in a route cannot read another
 * company's rows.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
