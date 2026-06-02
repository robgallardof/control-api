import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateLicenseToken } from "../../lib/controlService";
import { getJsonBody, sendJson } from "../../lib/vercelHttp";
import { z, ZodError } from "zod";

/**
 * Validates the payload accepted by the license-only validation endpoint.
 */
const LicenseValidationRequestSchema = z.object({
  token: z.string().trim().min(1).max(256)
});

/**
 * Validates a license token without registering a device.
 * @param request The incoming Vercel request.
 * @param response The outgoing Vercel response.
 */
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== "POST") {
    sendJson(response, 405, { valid: false, reason: "method_not_allowed" });
    return;
  }

  try {
    const payload = LicenseValidationRequestSchema.parse(getJsonBody(request));
    const result = await validateLicenseToken(payload.token);
    sendJson(response, result.valid ? 200 : 403, result);
  } catch (error) {
    if (error instanceof ZodError) {
      sendJson(response, 400, {
        valid: false,
        reason: "invalid_request_payload",
        issues: error.issues
      });
      return;
    }

    console.error(error);
    sendJson(response, 500, {
      valid: false,
      reason: "internal_api_error"
    });
  }
}
