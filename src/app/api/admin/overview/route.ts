import type { NextRequest } from "next/server";
import { getAdminOverview } from "@server/adminService";
import { jsonResponse } from "../../_responses";
import { assertAdminRequest } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    return jsonResponse(await getAdminOverview());
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 401 });
  }
}
