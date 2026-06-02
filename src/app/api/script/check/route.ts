import { handleScriptCheck } from "@/lib/controlService";
import { getClientMetadata } from "@/lib/http";
import { ScriptCheckRequestSchema } from "@/lib/payload";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Forces this route/page to render dynamically because it reads live database state.
 */
export const dynamic = "force-dynamic";

/**
 * Validates a userscript access request, registers devices, and stores activity.
 * @param request The incoming request.
 * @returns The access decision as JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const json = await request.json();
    const payload = ScriptCheckRequestSchema.parse(json);
    const client = getClientMetadata(request);
    const result = await handleScriptCheck(payload, client);

    return NextResponse.json(result, {
      status: result.allowed ? 200 : 403,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          allowed: false,
          reason: "Invalid request payload.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    console.error(error);

    return NextResponse.json(
      {
        allowed: false,
        reason: "Internal API error."
      },
      { status: 500 }
    );
  }
}
