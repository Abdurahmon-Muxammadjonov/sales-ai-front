"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Supabase renamed the browser key from "anon" to "publishable", and its
 * dashboard now shows the new name — so that is what a person copying it into
 * a deployment naturally types. Both are accepted: the alternative is an app
 * that looks unconfigured because of a word.
 */
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Exactly which variables a deployment is missing.
 *
 * These are inlined at build time, so a forgotten one cannot be noticed at
 * runtime by any other means — and without naming it, the only symptom is a
 * disabled sign-in button with no explanation.
 */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.NEXT_PUBLIC_API_URL) missing.push("NEXT_PUBLIC_API_URL");
  return missing;
}

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
