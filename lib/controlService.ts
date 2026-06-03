import { getOptionalEnv } from "./env";
import { hashToken } from "./hash";
import type { ClientMetadata } from "./http";
import type { EnforcementMode, ScriptCheckRequest } from "./payload";
import { sanitizeAccountProfile } from "./profile";
import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * A license record returned by Supabase.
 */
interface LicenseRecord {
  /** The license id. */
  id: string;

  /** Friendly owner name. */
  owner_name: string;

  /** Optional account username. */
  username: string | null;

  /** The raw license token, stored only because this project is for testing. */
  token_plain: string | null;

  /** The hashed license token. */
  token_hash: string | null;

  /** License status. */
  status: string;

  /** Maximum allowed devices for the license. */
  max_devices: number;

  /** Optional expiration date. */
  expires_at: string | null;
}

/**
 * Result returned to the userscript.
 */
export interface AccessResult {
  /** Whether the script can continue. */
  allowed: boolean;

  /** The active enforcement mode. */
  mode: EnforcementMode;

  /** Optional human-readable reason. */
  reason?: string;

  /** Optional user-facing message. */
  message?: string | null;

  /** The license owner name, when a license matched. */
  ownerName?: string | null;

  /** The username attached to the license, when a license matched. */
  username?: string | null;

  /** The license expiration date, when configured. */
  expiresAt?: string | null;

  /** The number of devices already registered for the license. */
  registeredDevices?: number;

  /** The maximum number of devices allowed for the license. */
  maxDevices?: number;
}

/**
 * Result returned by the dedicated license validation endpoint.
 */
export interface LicenseValidationResult {
  /** Whether the license can be used. */
  valid: boolean;

  /** Optional machine-readable reason. */
  reason?: string;

  /** The matching license id. */
  licenseId?: string;

  /** The license owner name. */
  ownerName?: string | null;

  /** The username attached to the license. */
  username?: string | null;

  /** License status. */
  status?: string;

  /** Maximum allowed devices. */
  maxDevices?: number;

  /** Expiration date, when configured. */
  expiresAt?: string | null;
}

/**
 * Reads the active enforcement mode from settings.
 * @returns The configured enforcement mode.
 */
export async function getEnforcementMode(): Promise<EnforcementMode> {
  const fallback = getOptionalEnv("DEFAULT_ENFORCEMENT_MODE", "open");
  const safeFallback = fallback === "soft" || fallback === "strict" ? fallback : "open";

  const { data, error } = await getSupabaseAdmin()
    .from("app_settings")
    .select("value")
    .eq("key", "enforcement_mode")
    .maybeSingle();

  if (error || !data?.value) {
    return safeFallback;
  }

  const value = typeof data.value === "string" ? data.value : data.value?.mode;

  if (value === "open" || value === "soft" || value === "strict") {
    return value;
  }

  return safeFallback;
}

/**
 * Evaluates the incoming userscript request and stores audit events.
 * @param payload The userscript request body.
 * @param client The client metadata derived from request headers.
 * @returns The access decision.
 */
export async function handleScriptCheck(payload: ScriptCheckRequest, client: ClientMetadata): Promise<AccessResult> {
  const mode = await getEnforcementMode();
  const token = payload.token?.trim() || null;
  const accountTokenRaw = payload.accountToken?.trim() || null;
  const accountTokenHash = accountTokenRaw ? hashToken(accountTokenRaw) : null;
  const accountProfile = sanitizeAccountProfile(payload.account as Record<string, unknown> | null | undefined);

  if (await isBlocked("ip", client.ipAddress)) {
    await logEvent(payload, client, null, "blocked_ip", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "This IP is blocked."
    };
  }

  if (await isBlocked("device", payload.deviceId)) {
    await logEvent(payload, client, null, "blocked_device", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "This device is blocked."
    };
  }

  const country = accountProfile?.country ?? client.country;

  if (await isBlocked("country", country)) {
    await logEvent(payload, client, null, "blocked_country", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "This country is blocked."
    };
  }

  if (await isBlocked("account", accountProfile?.accountId)) {
    await logEvent(payload, client, null, "blocked_account", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "This account is blocked."
    };
  }

  if ((await isBlocked("account_token", accountTokenRaw)) || (await isBlocked("account_token_hash", accountTokenHash))) {
    await logEvent(payload, client, null, "blocked_account_token", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "This Wplace account token is blocked."
    };
  }

  if (!token) {
    await logEvent(payload, client, null, "missing_token", accountTokenHash, accountTokenRaw);

    if (mode === "strict") {
      return {
        allowed: false,
        mode,
        reason: "Access token is required."
      };
    }

    return {
      allowed: true,
      mode,
      message: mode === "soft" ? "Access token will be required soon." : null
    };
  }

  const tokenHash = hashToken(token);

  if ((await isBlocked("token", token)) || (await isBlocked("token_hash", tokenHash))) {
    await logEvent(payload, client, null, "blocked_token", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "This token is blocked."
    };
  }

  const license = await findLicenseByToken(token);

  if (!license) {
    await logEvent(payload, client, null, "invalid_token", accountTokenHash, accountTokenRaw);

    if (mode === "strict") {
      return {
        allowed: false,
        mode,
        reason: "Invalid access token."
      };
    }

    return {
      allowed: true,
      mode,
      message: mode === "soft" ? "This token is not registered yet." : null
    };
  }

  const validation = await evaluateLicense(license);

  if (!validation.valid) {
    await logEvent(payload, client, license.id, validation.reason ?? "invalid_license", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: validation.reason === "expired_license" ? "This token is expired." : "This token is inactive.",
      ownerName: license.owner_name,
      username: license.username,
      expiresAt: license.expires_at,
      maxDevices: license.max_devices
    };
  }

  const deviceResult = await registerOrUpdateDevice(license, payload.deviceId, client);

  if (!deviceResult.allowed) {
    await logEvent(payload, client, license.id, "device_limit_reached", accountTokenHash, accountTokenRaw);

    return {
      allowed: false,
      mode,
      reason: "Device limit reached.",
      registeredDevices: deviceResult.registeredDevices,
      maxDevices: license.max_devices,
      ownerName: license.owner_name,
      username: license.username,
      expiresAt: license.expires_at
    };
  }

  await updateLicenseLastSeen(license.id);
  await upsertAccountSnapshot(payload, client, license.id, accountTokenHash, accountTokenRaw);
  await logEvent(payload, client, license.id, "allowed", accountTokenHash, accountTokenRaw);

  return {
    allowed: true,
    mode,
    ownerName: license.owner_name,
    username: license.username,
    expiresAt: license.expires_at,
    registeredDevices: deviceResult.registeredDevices,
    maxDevices: license.max_devices
  };
}

/**
 * Validates a raw license token without registering a device or storing a script event.
 * @param token The raw license token.
 * @returns The license validation result.
 */
export async function validateLicenseToken(token: string): Promise<LicenseValidationResult> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      valid: false,
      reason: "missing_token"
    };
  }

  const tokenHash = hashToken(normalizedToken);

  if ((await isBlocked("token", normalizedToken)) || (await isBlocked("token_hash", tokenHash))) {
    return {
      valid: false,
      reason: "blocked_token"
    };
  }

  const license = await findLicenseByToken(normalizedToken);

  if (!license) {
    return {
      valid: false,
      reason: "invalid_token"
    };
  }

  const validation = await evaluateLicense(license);

  return {
    valid: validation.valid,
    reason: validation.reason,
    licenseId: license.id,
    ownerName: license.owner_name,
    username: license.username,
    status: license.status,
    maxDevices: license.max_devices,
    expiresAt: license.expires_at
  };
}

/**
 * Finds a license by raw token or hash.
 * @param token The raw license token.
 * @returns The matching license or null.
 */
async function findLicenseByToken(token: string): Promise<LicenseRecord | null> {
  const tokenHash = hashToken(token);
  const rawMatch = await findLicenseByColumn("token_plain", token);

  if (rawMatch) {
    return rawMatch;
  }

  return findLicenseByColumn("token_hash", tokenHash);
}

/**
 * Finds a license by a specific token column.
 * @param column The token column name.
 * @param value The token column value.
 * @returns The matching license or null.
 */
async function findLicenseByColumn(column: "token_plain" | "token_hash", value: string): Promise<LicenseRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("licenses")
    .select("id, owner_name, username, token_plain, token_hash, status, max_devices, expires_at")
    .eq(column, value)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LicenseRecord | null) ?? null;
}

/**
 * Evaluates status and expiration for a license.
 * @param license The license record.
 * @returns Whether the license can be used.
 */
async function evaluateLicense(license: LicenseRecord): Promise<{ valid: boolean; reason?: string }> {
  const licenseExpired = license.expires_at ? new Date(license.expires_at).getTime() <= Date.now() : false;

  if (licenseExpired) {
    return {
      valid: false,
      reason: "expired_license"
    };
  }

  if (license.status !== "active") {
    return {
      valid: false,
      reason: "inactive_license"
    };
  }

  return {
    valid: true
  };
}

/**
 * Checks whether a blocking rule exists for a value.
 * @param type The rule type.
 * @param value The rule value.
 * @returns True when a currently active blocking rule exists.
 */
async function isBlocked(type: string, value: string | null | undefined): Promise<boolean> {
  if (!value) {
    return false;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("blocked_rules")
    .select("id")
    .eq("type", type)
    .eq("value", value)
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data?.length);
}

/**
 * Registers a new device or updates an existing device for a license.
 * @param license The license record.
 * @param deviceId The userscript device id.
 * @param client The client metadata.
 * @returns The device registration result.
 */
async function registerOrUpdateDevice(
  license: LicenseRecord,
  deviceId: string,
  client: ClientMetadata
): Promise<{ allowed: boolean; registeredDevices: number }> {
  const { data: existingDevice, error: existingError } = await getSupabaseAdmin()
    .from("license_devices")
    .select("id, status")
    .eq("license_id", license.id)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingDevice) {
    if (existingDevice.status !== "active") {
      return { allowed: false, registeredDevices: await countDevices(license.id) };
    }

    await getSupabaseAdmin()
      .from("license_devices")
      .update({
        last_ip: client.ipAddress,
        country: client.country,
        region: client.region,
        city: client.city,
        user_agent: client.userAgent,
        last_seen_at: new Date().toISOString()
      })
      .eq("id", existingDevice.id);

    return { allowed: true, registeredDevices: await countDevices(license.id) };
  }

  const registeredDevices = await countDevices(license.id);

  if (registeredDevices >= license.max_devices) {
    return { allowed: false, registeredDevices };
  }

  const { error: insertError } = await getSupabaseAdmin().from("license_devices").insert({
    license_id: license.id,
    device_id: deviceId,
    status: "active",
    first_ip: client.ipAddress,
    last_ip: client.ipAddress,
    country: client.country,
    region: client.region,
    city: client.city,
    user_agent: client.userAgent
  });

  if (insertError) {
    throw insertError;
  }

  return { allowed: true, registeredDevices: registeredDevices + 1 };
}

/**
 * Counts active devices for a license.
 * @param licenseId The license id.
 * @returns The number of active devices.
 */
async function countDevices(licenseId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("license_devices")
    .select("id", { count: "exact", head: true })
    .eq("license_id", licenseId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Updates the last seen date for a license.
 * @param licenseId The license id.
 */
async function updateLicenseLastSeen(licenseId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("licenses")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", licenseId);

  if (error) {
    throw error;
  }
}

/**
 * Upserts the latest account profile snapshot.
 * @param payload The userscript request body.
 * @param client The client metadata.
 * @param licenseId The matched license id.
 * @param accountTokenHash The optional account token hash.
 * @param accountTokenRaw The optional raw account token.
 */
async function upsertAccountSnapshot(
  payload: ScriptCheckRequest,
  client: ClientMetadata,
  licenseId: string,
  accountTokenHash: string | null,
  accountTokenRaw: string | null
): Promise<void> {
  const profile = sanitizeAccountProfile(payload.account as Record<string, unknown> | null | undefined);

  if (!profile?.accountId) {
    return;
  }

  const now = new Date().toISOString();
  const isPainted = payload.eventType === "painted";

  const { error } = await getSupabaseAdmin().from("account_snapshots").upsert(
    {
      license_id: licenseId,
      device_id: payload.deviceId,
      account_id: profile.accountId,
      account_name: profile.accountName,
      discord: profile.discord,
      discord_id: profile.discordId,
      country: profile.country ?? client.country,
      alliance_id: profile.allianceId,
      alliance_name: profile.allianceName,
      role: profile.role,
      level: profile.level,
      pixels_painted: profile.pixelsPainted,
      droplets: profile.droplets,
      is_customer: profile.isCustomer,
      suspension_reason: profile.suspensionReason,
      timeout_until: profile.timeoutUntil,
      raw_profile: profile.rawProfile,
      account_token_hash: accountTokenHash,
      account_token_raw: accountTokenRaw,
      picture_hash: profile.pictureHash,
      last_seen_at: now,
      last_painted_at: isPainted ? now : undefined,
      last_url: payload.currentUrl,
      updated_at: now
    },
    {
      onConflict: "license_id,device_id,account_id"
    }
  );

  if (error) {
    throw error;
  }
}

/**
 * Stores a userscript audit event.
 * @param payload The userscript request body.
 * @param client The client metadata.
 * @param licenseId The matched license id.
 * @param status The event status.
 * @param accountTokenHash The optional account token hash.
 * @param accountTokenRaw The optional raw account token.
 */
async function logEvent(
  payload: ScriptCheckRequest,
  client: ClientMetadata,
  licenseId: string | null,
  status: string,
  accountTokenHash: string | null,
  accountTokenRaw: string | null
): Promise<void> {
  const profile = sanitizeAccountProfile(payload.account as Record<string, unknown> | null | undefined);

  const { error } = await getSupabaseAdmin().from("script_events").insert({
    license_id: licenseId,
    device_id: payload.deviceId,
    event_type: payload.eventType,
    status,
    ip_address: client.ipAddress,
    country: client.country,
    region: client.region,
    city: client.city,
    user_agent: client.userAgent,
    script_version: payload.scriptVersion,
    current_url: payload.currentUrl,
    storage_key: payload.storageKey,
    account_id: profile?.accountId ?? null,
    account_name: profile?.accountName ?? null,
    account_token_hash: accountTokenHash,
    account_token_raw: accountTokenRaw,
    metadata: payload.metadata ?? {}
  });

  if (error) {
    throw error;
  }
}
