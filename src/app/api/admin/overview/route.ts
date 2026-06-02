import { assertAdminRequest } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

/**
 * Forces this route/page to render dynamically because it reads live database state.
 */
export const dynamic = "force-dynamic";

/**
 * Returns recent account snapshots and script events for a small dashboard.
 * @param request The incoming request.
 * @returns The dashboard data.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    assertAdminRequest(request);

    const [accountsResult, eventsResult, licensesResult] = await Promise.all([
      supabaseAdmin
        .from("account_snapshots")
        .select("id, license_id, device_id, account_id, account_name, discord, country, alliance_name, level, pixels_painted, last_seen_at, last_painted_at, last_url, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("script_events")
        .select("id, license_id, device_id, event_type, status, ip_address, country, city, script_version, current_url, account_id, account_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
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

    return NextResponse.json({
      accounts: accountsResult.data ?? [],
      events: eventsResult.data ?? [],
      licenses: licensesResult.data ?? []
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 401 }
    );
  }
}
