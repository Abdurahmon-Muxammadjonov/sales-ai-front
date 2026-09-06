"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when the app has been given Supabase credentials. Screens check this so
 * a missing .env.local produces a readable message instead of a crash.
 */
export const supabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client, created once per tab.
 *
 * Only ever the anon key: row level security is what keeps one company from
 * reading another's rows, and a service key in the bundle would defeat it.
 */
export function getSupabase(): SupabaseClient {
  if (!cached) {
    if (!url || !anonKey) {
      throw new Error("supabase-not-configured");
    }
    cached = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}
