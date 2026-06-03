import { z } from "zod";
import { createPlainToken, hashToken } from "./hash";
import { getSupabaseAdmin } from "./supabaseAdmin";

export const LicenseStatusSchema = z.enum(["active", "blocked", "expired"]);
export const BlockRuleTypeSchema = z.enum(["ip", "token", "token_hash", "device", "country", "account", "account_token", "account_token_hash"]);
export const EnforcementModeSchema = z.enum(["open", "soft", "strict"]);

export const CreateLicenseSchema = z.object({
  ownerName: z.string().trim().min(1).max(128),
  username: z.string().trim().max(128).optional().nullable(),
  token: z.string().trim().min(8).max(256).optional().nullable(),
  maxDevices: z.coerce.number().int().min(1).max(100).default(10),
  expiresAt: z.string().datetime().optional().nullable()
});

export const UpdateLicenseSchema = z.object({
  id: z.string().uuid(),
  ownerName: z.string().trim().min(1).max(128).optional(),
  username: z.string().trim().max(128).optional().nullable(),
  status: LicenseStatusSchema.optional(),
  maxDevices: z.coerce.number().int().min(1).max(100).optional(),
  expiresAt: z.string().datetime().optional().nullable()
});

export const CreateBlockRuleSchema = z.object({
  type: BlockRuleTypeSchema,
  value: z.string().trim().min(1).max(512),
  reason: z.string().trim().max(512).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable()
});

export const UpdateBlockRuleSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean()
});

export const UpdateDeviceSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "blocked"])
});

export const UpdateEnforcementModeSchema = z.object({
  mode: EnforcementModeSchema
});

export type CreateLicenseInput = z.infer<typeof CreateLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof UpdateLicenseSchema>;
export type CreateBlockRuleInput = z.infer<typeof CreateBlockRuleSchema>;
export type UpdateBlockRuleInput = z.infer<typeof UpdateBlockRuleSchema>;
export type UpdateDeviceInput = z.infer<typeof UpdateDeviceSchema>;
export type UpdateEnforcementModeInput = z.infer<typeof UpdateEnforcementModeSchema>;

export interface AdminOverview {
  metrics: {
    totalLicenses: number;
    activeLicenses: number;
    blockedLicenses: number;
    expiredLicenses: number;
    totalAccounts: number;
    totalDevices: number;
    blockedDevices: number;
    events24h: number;
    denied24h: number;
  };
  enforcementMode: "open" | "soft" | "strict";
  licenses: unknown[];
  accounts: unknown[];
  devices: unknown[];
  events: unknown[];
  blockedRules: unknown[];
}

/**
 * Reads the dashboard data used by the admin panel.
 * @returns Aggregated dashboard data.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    licensesResult,
    licenseTokensResult,
    accountsResult,
    devicesResult,
    eventsResult,
    blockedRulesResult,
    enforcementResult,
    events24hResult,
    denied24hResult
  ] = await Promise.all([
    getSupabaseAdmin().from("license_overview").select("*").order("created_at", { ascending: false }),
    getSupabaseAdmin().from("licenses").select("id, token_plain, token_hash"),
    getSupabaseAdmin()
      .from("account_snapshots")
      .select("id, license_id, device_id, account_id, account_name, discord, discord_id, country, alliance_id, alliance_name, role, level, pixels_painted, droplets, is_customer, suspension_reason, timeout_until, raw_profile, account_token_hash, account_token_raw, picture_hash, last_seen_at, last_painted_at, last_url, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
    getSupabaseAdmin()
      .from("license_devices")
      .select("id, license_id, device_id, status, first_ip, last_ip, country, region, city, user_agent, first_seen_at, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(100),
    getSupabaseAdmin()
      .from("script_events")
      .select("id, license_id, device_id, event_type, status, ip_address, country, city, script_version, current_url, account_id, account_name, account_token_hash, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(150),
    getSupabaseAdmin()
      .from("blocked_rules")
      .select("id, type, value, reason, active, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    getSupabaseAdmin().from("app_settings").select("value").eq("key", "enforcement_mode").maybeSingle(),
    getSupabaseAdmin()
      .from("script_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    getSupabaseAdmin()
      .from("script_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h)
      .neq("status", "allowed")
  ]);

  const results = [licensesResult, licenseTokensResult, accountsResult, devicesResult, eventsResult, blockedRulesResult, enforcementResult, events24hResult, denied24hResult];
  for (const result of results) {
    if (result.error) {
      throw result.error;
    }
  }

  const tokenByLicenseId = new Map(
    (licenseTokensResult.data ?? []).map((license) => [
      license.id,
      {
        token_plain: license.token_plain,
        token_hash: license.token_hash
      }
    ])
  );
  const licenses = (licensesResult.data ?? []).map((license) => ({
    ...license,
    ...(tokenByLicenseId.get(license.id) ?? {})
  }));
  const devices = devicesResult.data ?? [];
  const enforcementValue = enforcementResult.data?.value;
  const enforcementMode = parseEnforcementMode(typeof enforcementValue === "string" ? enforcementValue : enforcementValue?.mode);

  return {
    metrics: {
      totalLicenses: licenses.length,
      activeLicenses: licenses.filter((license) => license.status === "active").length,
      blockedLicenses: licenses.filter((license) => license.status === "blocked").length,
      expiredLicenses: licenses.filter((license) => license.status === "expired").length,
      totalAccounts: accountsResult.data?.length ?? 0,
      totalDevices: devices.length,
      blockedDevices: devices.filter((device) => device.status === "blocked").length,
      events24h: events24hResult.count ?? 0,
      denied24h: denied24hResult.count ?? 0
    },
    enforcementMode,
    licenses,
    accounts: accountsResult.data ?? [],
    devices,
    events: eventsResult.data ?? [],
    blockedRules: blockedRulesResult.data ?? []
  };
}

/**
 * Creates a new license and returns the raw token exactly once.
 * @param input License creation input.
 * @returns The inserted license and token.
 */
export async function createLicense(input: unknown): Promise<{ license: unknown; token: string }> {
  const body = CreateLicenseSchema.parse(input);
  const token = body.token?.trim() || createPlainToken();
  const tokenHash = hashToken(token);

  const { data, error } = await getSupabaseAdmin()
    .from("licenses")
    .insert({
      owner_name: body.ownerName,
      username: body.username || null,
      token_plain: token,
      token_hash: tokenHash,
      max_devices: body.maxDevices,
      expires_at: body.expiresAt === undefined ? getDefaultExpiration() : body.expiresAt
    })
    .select("id, owner_name, username, token_plain, status, max_devices, expires_at, created_at")
    .single();

  if (error) {
    throw error;
  }

  return { license: data, token };
}

/**
 * Updates a license from the admin panel.
 * @param input License update input.
 * @returns The updated license row.
 */
export async function updateLicense(input: unknown): Promise<unknown> {
  const body = UpdateLicenseSchema.parse(input);
  const patch: Record<string, unknown> = {};

  if (body.ownerName !== undefined) {
    patch.owner_name = body.ownerName;
  }

  if (body.username !== undefined) {
    patch.username = body.username || null;
  }

  if (body.status !== undefined) {
    patch.status = body.status;
  }

  if (body.maxDevices !== undefined) {
    patch.max_devices = body.maxDevices;
  }

  if (body.expiresAt !== undefined) {
    patch.expires_at = body.expiresAt;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("licenses")
    .update(patch)
    .eq("id", body.id)
    .select("id, owner_name, username, status, max_devices, expires_at, created_at, last_seen_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Creates or reactivates a blocking rule.
 * @param input Blocking rule input.
 * @returns The blocking rule row.
 */
export async function createBlockRule(input: unknown): Promise<unknown> {
  const body = CreateBlockRuleSchema.parse(input);

  const { data, error } = await getSupabaseAdmin()
    .from("blocked_rules")
    .upsert(
      {
        type: body.type,
        value: body.value,
        reason: body.reason || null,
        active: true,
        expires_at: body.expiresAt || null
      },
      { onConflict: "type,value" }
    )
    .select("id, type, value, reason, active, expires_at, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Activates or deactivates an existing blocking rule.
 * @param input Blocking rule update input.
 * @returns The updated blocking rule row.
 */
export async function updateBlockRule(input: unknown): Promise<unknown> {
  const body = UpdateBlockRuleSchema.parse(input);
  const { data, error } = await getSupabaseAdmin()
    .from("blocked_rules")
    .update({ active: body.active })
    .eq("id", body.id)
    .select("id, type, value, reason, active, expires_at, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Updates a registered device status.
 * @param input Device update input.
 * @returns The updated device row.
 */
export async function updateDevice(input: unknown): Promise<unknown> {
  const body = UpdateDeviceSchema.parse(input);
  const { data, error } = await getSupabaseAdmin()
    .from("license_devices")
    .update({ status: body.status })
    .eq("id", body.id)
    .select("id, license_id, device_id, status, first_ip, last_ip, country, city, last_seen_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Updates global API enforcement mode.
 * @param input Enforcement mode input.
 * @returns The persisted setting.
 */
export async function updateEnforcementMode(input: unknown): Promise<unknown> {
  const body = UpdateEnforcementModeSchema.parse(input);
  const { data, error } = await getSupabaseAdmin()
    .from("app_settings")
    .upsert(
      {
        key: "enforcement_mode",
        value: body.mode,
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    )
    .select("key, value, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function getDefaultExpiration(): string {
  const expiration = new Date();
  expiration.setUTCFullYear(expiration.getUTCFullYear() + 1);
  return expiration.toISOString();
}

function parseEnforcementMode(value: unknown): "open" | "soft" | "strict" {
  return value === "soft" || value === "strict" ? value : "open";
}
