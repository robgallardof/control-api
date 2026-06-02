import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertAdminKey } from "../../lib/admin";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { getRequestHeader, sendJson } from "../../lib/vercelHttp";

/**
 * Returns recent account snapshots and script events for the dashboard.
 * @param request The incoming Vercel request.
 * @param response The outgoing Vercel response.
 */
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  try {
    assertAdminKey(getRequestHeader(request, "x-admin-key"));

    const [accountsResult, eventsResult, licensesResult] = await Promise.all([
      getSupabaseAdmin()
        .from("account_snapshots")
        .select("id, license_id, device_id, account_id, account_name, discord, country, alliance_name, level, pixels_painted, last_seen_at, last_painted_at, last_url, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      getSupabaseAdmin()
        .from("script_events")
        .select("id, license_id, device_id, event_type, status, ip_address, country, city, script_version, current_url, account_id, account_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      getSupabaseAdmin()
        .from("license_overview")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    if (accountsResult.error) {
      throw accountsResult.error;
    }

    if (eventsResult.error) {
      throw eventsResult.error;
    }

    if (licensesResult.error) {
      throw licensesResult.error;
    }

    sendJson(response, 200, {
      accounts: accountsResult.data ?? [],
      events: eventsResult.data ?? [],
      licenses: licensesResult.data ?? []
    });
  } catch (error) {
    sendJson(response, 401, { error: error instanceof Error ? error.message : "Unknown error" });
  }
}
