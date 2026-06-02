import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson } from "../lib/vercelHttp";

/**
 * Returns a basic health response that does not require database access.
 * @param request The incoming Vercel request.
 * @param response The outgoing Vercel response.
 */
export default function handler(request: VercelRequest, response: VercelResponse): void {
  sendJson(response, 200, { ok: true, name: "control-app" });
}
