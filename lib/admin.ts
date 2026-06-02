import { getRequiredEnv } from "./env";
import { safeEquals } from "./hash";

/**
 * Verifies the admin API key value.
 * @param providedKey The key sent by the caller.
 * @returns True when the admin key is valid.
 */
export function isAdminKeyValid(providedKey: string | null | undefined): boolean {
  const configuredKey = getRequiredEnv("ADMIN_API_KEY");
  return safeEquals(configuredKey, providedKey || "");
}

/**
 * Throws an error when the provided admin key is not valid.
 * @param providedKey The key sent by the caller.
 */
export function assertAdminKey(providedKey: string | null | undefined): void {
  if (!isAdminKeyValid(providedKey)) {
    throw new Error("Unauthorized admin request.");
  }
}
