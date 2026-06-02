import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { createBlockRule, updateBlockRule } from "@server/adminService";
import { jsonResponse, readJson } from "../../_responses";
import { assertAdminRequest } from "../_auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    return jsonResponse({ rule: await createBlockRule(await readJson(request)) });
  } catch (error) {
    return jsonResponse(formatAdminError(error), { status: error instanceof ZodError ? 400 : 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    return jsonResponse({ rule: await updateBlockRule(await readJson(request)) });
  } catch (error) {
    return jsonResponse(formatAdminError(error), { status: error instanceof ZodError ? 400 : 500 });
  }
}

function formatAdminError(error: unknown): { error: string; issues?: unknown } {
  if (error instanceof ZodError) {
    return { error: "Invalid admin payload.", issues: error.issues };
  }

  return { error: error instanceof Error ? error.message : "Unknown error." };
}
