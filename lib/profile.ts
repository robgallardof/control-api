import { sha256 } from "./hash";

/**
 * Sanitized account profile ready to be stored.
 */
export interface SanitizedAccountProfile {
  /** The account id as text. */
  accountId: string | null;

  /** The account name. */
  accountName: string | null;

  /** The Discord handle. */
  discord: string | null;

  /** The Discord id as text. */
  discordId: string | null;

  /** The country code reported by the account profile. */
  country: string | null;

  /** The alliance id as text. */
  allianceId: string | null;

  /** The alliance name. */
  allianceName: string | null;

  /** The account role. */
  role: string | null;

  /** The level value. */
  level: number | null;

  /** The pixels painted count. */
  pixelsPainted: number | null;

  /** The droplet count. */
  droplets: number | null;

  /** Whether the profile reports customer status. */
  isCustomer: boolean | null;

  /** The suspension reason, when present. */
  suspensionReason: string | null;

  /** The timeout end date, when present. */
  timeoutUntil: string | null;

  /** A hash of the picture data instead of the raw base64 image. */
  pictureHash: string | null;

  /** The sanitized raw profile JSON without the base64 picture. */
  rawProfile: Record<string, unknown>;
}

/**
 * Converts unknown values to nullable strings.
 * @param value The source value.
 * @returns The string representation or null.
 */
function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

/**
 * Converts unknown values to nullable numbers.
 * @param value The source value.
 * @returns The numeric value or null.
 */
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

/**
 * Converts unknown values to nullable booleans.
 * @param value The source value.
 * @returns The boolean value or null.
 */
function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

/**
 * Sanitizes an account profile by removing large or sensitive raw fields.
 * @param account The account profile payload.
 * @returns A normalized profile snapshot.
 */
export function sanitizeAccountProfile(account: Record<string, unknown> | null | undefined): SanitizedAccountProfile | null {
  if (!account) {
    return null;
  }

  const rawProfile = { ...account };
  const picture = typeof rawProfile.picture === "string" ? rawProfile.picture : null;
  delete rawProfile.picture;

  return {
    accountId: toStringOrNull(account.id),
    accountName: toStringOrNull(account.name),
    discord: toStringOrNull(account.discord),
    discordId: toStringOrNull(account.discordId),
    country: toStringOrNull(account.country),
    allianceId: toStringOrNull(account.allianceId),
    allianceName: toStringOrNull(account.allianceName),
    role: toStringOrNull(account.role),
    level: toNumberOrNull(account.level),
    pixelsPainted: toNumberOrNull(account.pixelsPainted),
    droplets: toNumberOrNull(account.droplets),
    isCustomer: toBooleanOrNull(account.isCustomer),
    suspensionReason: toStringOrNull(account.suspensionReason),
    timeoutUntil: toStringOrNull(account.timeoutUntil),
    pictureHash: picture ? sha256(picture) : null,
    rawProfile
  };
}
