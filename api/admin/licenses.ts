import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { assertAdminKey } from "../../lib/admin";
import { createPlainToken, hashToken } from "../../lib/hash";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import { getJsonBody, getRequestHeader, sendJson } from "../../lib/vercelHttp";

/**
 * Validates the admin payload used to create a license.
 */
const CreateLicenseSchema = z.object({
  ownerName: z.string().trim().min(1).max(128),
  username: z.string().trim().max(128).optional().nullable(),
  token: z.string().trim().min(8).max(256).optional().nullable(),
  maxDevices: z.number().int().min(1).max(100).default(10),
  expiresAt: z.string().datetime().optional().nullable()
});

/**
 * Returns the default expiration date for newly created test licenses.
 * @returns An ISO date one year from now.
 */
function getDefaultExpiration(): string {
  const expiration = new Date();
  expiration.setUTCFullYear(expiration.getUTCFullYear() + 1);
  return expiration.toISOString();
}

/**
 * Handles license listing and creation for admin callers.
 * @param request The incoming Vercel request.
 * @param response The outgoing Vercel response.
 */
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertAdminKey(getRequestHeader(request, "x-admin-key"));

    if (request.method === "GET") {
      const { data, error } = await getSupabaseAdmin()
        .from("license_overview")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      sendJson(response, 200, { licenses: data ?? [] });
      return;
    }

    if (request.method === "POST") {
      const body = CreateLicenseSchema.parse(getJsonBody(request));
      const token = body.token?.trim() || createPlainToken();
      const tokenHash = hashToken(token);
      const expiresAt = body.expiresAt === null ? null : body.expiresAt || getDefaultExpiration();

      const { data, error } = await getSupabaseAdmin()
        .from("licenses")
        .insert({
          owner_name: body.ownerName,
          username: body.username,
          token_plain: token,
          token_hash: tokenHash,
          max_devices: body.maxDevices,
          expires_at: expiresAt
        })
        .select("id, owner_name, username, token_plain, status, max_devices, expires_at, created_at")
        .single();

      if (error) {
        throw error;
      }

      sendJson(response, 200, {
        license: data,
        token,
        warning: "Raw tokens are stored because this test project requested it. Do not expose this database publicly."
      });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Unknown error" });
  }
}
