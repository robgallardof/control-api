import { validateLicenseToken } from "@/lib/controlService";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

/**
 * Forces this route/page to render dynamically because it reads live database state.
 */
export const dynamic = "force-dynamic";

/**
 * Validates the payload accepted by the license-only validation endpoint.
 */
const LicenseValidationRequestSchema = z.object({
  token: z.string().trim().min(1).max(256)
});

/**
 * Validates a license token without registering a device.
 * @param request The incoming request.
 * @returns The license validation result.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = LicenseValidationRequestSchema.parse(await request.json());
    const result = await validateLicenseToken(payload.token);

    return NextResponse.json(result, {
      status: result.valid ? 200 : 403,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          valid: false,
          reason: "invalid_request_payload",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        valid: false,
        reason: "internal_api_error"
      },
      { status: 500 }
    );
  }
}
