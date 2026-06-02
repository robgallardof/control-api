import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getRequiredEnv } from "./env";

/**
 * Creates a random KGM license token suitable for sharing with one trusted user.
 * @returns A random URL-safe token.
 */
export function createPlainToken(): string {
  return `KGM-${randomBytes(27).toString("base64url")}`;
}

/**
 * Hashes a token with an HMAC pepper.
 * @param token The raw token received from the client.
 * @returns The token HMAC digest in hexadecimal form.
 */
export function hashToken(token: string): string {
  const pepper = getRequiredEnv("TOKEN_PEPPER");
  return createHmac("sha256", pepper).update(token).digest("hex");
}

/**
 * Hashes arbitrary text with SHA-256 for non-secret fingerprints.
 * @param value The input value.
 * @returns The SHA-256 digest in hexadecimal form.
 */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Compares two strings using a timing-safe comparison when lengths match.
 * @param left The first value.
 * @param right The second value.
 * @returns True when both values match.
 */
export function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
