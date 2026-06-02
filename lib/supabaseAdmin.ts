import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "./env";

/**
 * Cached Supabase admin client instance for server-side API handlers.
 */
let cachedClient: SupabaseClient | null = null;

/**
 * Creates or returns the Supabase admin client backed by the secret/service-role key.
 * The client is created lazily so Next.js/Vercel can complete build-time route analysis
 * before runtime environment variables are available.
 * @returns The server-side Supabase client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  return cachedClient;
}
