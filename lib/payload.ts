import { z } from "zod";

/**
 * Allowed control modes for the API.
 */
export const EnforcementModeSchema = z.enum(["open", "soft", "strict"]);

/**
 * Allowed event types sent by the userscript.
 */
export const ScriptEventTypeSchema = z.enum([
  "check",
  "heartbeat",
  "painted",
  "denied",
  "logout"
]);

/**
 * Flexible account profile payload sent by the userscript.
 */
export const AccountProfileSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional().nullable(),
    name: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    discord: z.string().optional().nullable(),
    discordId: z.union([z.string(), z.number()]).optional().nullable(),
    allianceId: z.union([z.string(), z.number()]).optional().nullable(),
    allianceName: z.string().optional().nullable(),
    allianceRole: z.string().optional().nullable(),
    level: z.number().optional().nullable(),
    pixelsPainted: z.number().optional().nullable(),
    droplets: z.number().optional().nullable(),
    isCustomer: z.boolean().optional().nullable(),
    suspensionReason: z.string().optional().nullable(),
    timeoutUntil: z.string().optional().nullable(),
    picture: z.string().optional().nullable()
  })
  .passthrough();

/**
 * Payload accepted by the userscript API.
 */
export const ScriptCheckRequestSchema = z.object({
  accessToken: z.string().trim().min(1).optional().nullable(),
  token: z.string().trim().min(1).optional().nullable(),
  deviceId: z.string().trim().min(6).max(256),
  eventType: ScriptEventTypeSchema.default("check"),
  scriptVersion: z.string().trim().max(64).optional().nullable(),
  currentUrl: z.string().trim().max(2048).optional().nullable(),
  storageKey: z.string().trim().max(256).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  account: AccountProfileSchema.optional().nullable(),
  accountToken: z.string().trim().min(1).optional().nullable()
});

/**
 * Userscript API payload type.
 */
export type ScriptCheckRequest = z.infer<typeof ScriptCheckRequestSchema>;

/**
 * Enforcement mode type.
 */
export type EnforcementMode = z.infer<typeof EnforcementModeSchema>;

/**
 * Script event type.
 */
export type ScriptEventType = z.infer<typeof ScriptEventTypeSchema>;
