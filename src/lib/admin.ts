import { getRequiredEnv } from "./env";
import { safeEquals } from "./hash";

/**
 * Verifies the admin API key sent in request headers.
 * @param request The incoming request.
 * @returns True when the admin key is valid.
 */
export function isAdminRequest(request: Request): boolean {
  const configuredKey = getRequiredEnv("ADMIN_API_KEY");
  const providedKey = request.headers.get("x-admin-key") || "";

  return safeEquals(configuredKey, providedKey);
}

/**
 * Throws an error when the request is not authorized as admin.
 * @param request The incoming request.
 */
export function assertAdminRequest(request: Request): void {
  if (!isAdminRequest(request)) {
    throw new Error("Unauthorized admin request.");
  }
}
