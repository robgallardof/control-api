import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleScriptCheck } from "../../lib/controlService";
import { ScriptCheckRequestSchema } from "../../lib/payload";
import { getClientMetadata, getJsonBody, sendJson } from "../../lib/vercelHttp";
import { ZodError } from "zod";

/**
 * Validates a userscript access request, registers devices, and stores activity.
 * @param request The incoming Vercel request.
 * @param response The outgoing Vercel response.
 */
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== "POST") {
    sendJson(response, 405, { allowed: false, reason: "Method not allowed." });
    return;
  }

  try {
    const payload = ScriptCheckRequestSchema.parse(getJsonBody(request));
    const client = getClientMetadata(request);
    const result = await handleScriptCheck(payload, client);
    sendJson(response, result.allowed ? 200 : 403, result);
  } catch (error) {
    if (error instanceof ZodError) {
      sendJson(response, 400, {
        allowed: false,
        reason: "Invalid request payload.",
        issues: error.issues
      });
      return;
    }

    console.error(error);
    sendJson(response, 500, {
      allowed: false,
      reason: "Internal API error."
    });
  }
}
