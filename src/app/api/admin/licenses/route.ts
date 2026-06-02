import { assertAdminRequest } from "@/lib/admin";
import { createPlainToken, hashToken } from "@/lib/hash";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Forces this route/page to render dynamically because it reads live database state.
 */
export const dynamic = "force-dynamic";

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
 * Lists licenses and their registered device counts.
 * @param request The incoming request.
 * @returns The license list.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    assertAdminRequest(request);

    const { data, error } = await supabaseAdmin
      .from("license_overview")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ licenses: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 401 }
    );
  }
}

/**
 * Creates a new license and stores the raw token for test visibility.
 * @param request The incoming request.
 * @returns The created license and raw token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertAdminRequest(request);

    const body = CreateLicenseSchema.parse(await request.json());
    const token = body.token?.trim() || createPlainToken();
    const tokenHash = hashToken(token);
    const expiresAt = body.expiresAt === null ? null : body.expiresAt || getDefaultExpiration();

    const { data, error } = await supabaseAdmin
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

    return NextResponse.json({
      license: data,
      token,
      warning: "Raw tokens are stored because this test project requested it. Do not expose this database publicly."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
