import { createHmac, randomBytes } from "crypto";
import { getOptionalEnv, getRequiredEnv } from "./env";
import { safeEquals } from "./hash";

/**
 * Cookie name used by the admin panel session.
 */
export const ADMIN_SESSION_COOKIE = "control_admin_session";

/**
 * Session lifetime in seconds.
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

interface AdminSessionPayload {
  sub: string;
  exp: number;
  nonce: string;
}

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

/**
 * Creates a signed session token for the admin panel.
 * @param username The authenticated admin user identifier.
 * @returns A signed session token.
 */
export function createAdminSessionToken(username: string): string {
  const payload: AdminSessionPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url")
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signSessionPayload(encodedPayload)}`;
}

/**
 * Verifies a signed admin session token.
 * @param token The raw cookie token.
 * @returns The session payload when valid, otherwise null.
 */
export function verifyAdminSessionToken(token: string | null | undefined): AdminSessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEquals(signSessionPayload(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload;

    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Signs a session payload with the configured session secret.
 * @param encodedPayload Base64url-encoded JSON payload.
 * @returns HMAC signature.
 */
function signSessionPayload(encodedPayload: string): string {
  return createHmac("sha256", getAdminSessionSecret()).update(encodedPayload).digest("base64url");
}

/**
 * Reads the admin session secret, falling back to ADMIN_API_KEY for smaller deployments.
 * @returns The session signing secret.
 */
function getAdminSessionSecret(): string {
  return getOptionalEnv("ADMIN_SESSION_SECRET", getRequiredEnv("ADMIN_API_KEY"));
}
