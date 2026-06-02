import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "./env";

/**
 * Supabase admin client backed by the service role key.
 * This client must only be used from server-side code.
 */
export const supabaseAdmin = createClient(
  getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);
