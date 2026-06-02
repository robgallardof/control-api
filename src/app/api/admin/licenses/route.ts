import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { createLicense, getAdminOverview, updateLicense } from "@server/adminService";
import { jsonResponse, readJson } from "../../_responses";
import { assertAdminRequest } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    const overview = await getAdminOverview();
    return jsonResponse({ licenses: overview.licenses });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 401 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    const result = await createLicense(await readJson(request));
    return jsonResponse({
      ...result,
      warning: "Store this token now. It is shown only in the creation response and should be shared privately."
    });
  } catch (error) {
    return jsonResponse(formatAdminError(error), { status: error instanceof ZodError ? 400 : 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    assertAdminRequest(request);
    return jsonResponse({ license: await updateLicense(await readJson(request)) });
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
