import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { updateEnforcementMode } from "@server/adminService";
import { jsonResponse, readJson } from "../../_responses";
import { assertAdminRequest } from "../_auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    return jsonResponse({ setting: await updateEnforcementMode(await readJson(request)) });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ error: "Invalid admin payload.", issues: error.issues }, { status: 400 });
    }

    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 500 });
  }
}
