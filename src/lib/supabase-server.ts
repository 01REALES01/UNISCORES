import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for Server Components / Route Handlers.
 * Uses the anon key (respects RLS) and does NOT require cookies.
 * Safe to call from any server context (ISR, RSC, API routes).
 */
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
