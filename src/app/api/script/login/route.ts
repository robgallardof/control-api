import { z, ZodError } from "zod";
import { handleScriptCheck, validateLicenseToken } from "@server/controlService";
import { getClientMetadata } from "@server/http";
import { ScriptCheckRequestSchema } from "@server/payload";
import { CLIENT_SESSION_MAX_AGE_SECONDS, createLicenseAccessToken } from "@server/userAuth";
import { jsonResponse, optionsResponse, readJson } from "../../_responses";

export const dynamic = "force-dynamic";

export const OPTIONS = optionsResponse;

const ClientMetadataSchema = z.record(z.unknown()).optional().nullable();

const MacroLoginRequestSchema = z.object({
  serialKey: z.string().trim().min(1).max(256),
  scriptVersion: z.string().trim().max(64).optional().nullable(),
  currentUrl: z.string().trim().max(2048).optional().nullable(),
  storageKey: z.string().trim().max(256).optional().nullable(),
  client: ClientMetadataSchema,
  wplace: z
    .object({
      me: z.record(z.unknown()).optional().nullable(),
      cookieJToken: z.string().trim().min(1).optional().nullable()
    })
    .optional()
    .nullable(),
  wplaceCookieJToken: z.string().trim().min(1).optional().nullable()
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = MacroLoginRequestSchema.parse(await readJson(request));
    const license = await validateLicenseToken(body.serialKey);

    if (!license.valid || !license.licenseId) {
      return jsonResponse(
        {
          success: false,
          reason: license.reason ?? "invalid_serial",
          serial: {
            valid: false,
            status: license.status ?? "invalid"
          }
        },
        { status: 403 }
      );
    }

    const deviceId = resolveDeviceId(body.client);
    const cookieJToken = body.wplace?.cookieJToken ?? body.wplaceCookieJToken ?? null;
    const scriptPayload = ScriptCheckRequestSchema.parse({
      token: body.serialKey,
      deviceId,
      eventType: "check",
      scriptVersion: body.scriptVersion,
      currentUrl: body.currentUrl,
      storageKey: body.storageKey,
      account: body.wplace?.me ?? null,
      accountToken: cookieJToken,
      metadata: {
        ...(body.client ?? {}),
        login: true,
        hasWplaceCookieJToken: Boolean(cookieJToken),
        serialValidatedBy: "control-api"
      }
    });
    const access = await handleScriptCheck(scriptPayload, getClientMetadata(request));

    if (!access.allowed) {
      return jsonResponse(
        {
          success: false,
          reason: access.reason ?? "access_denied",
          access,
          serial: {
            valid: true,
            status: license.status ?? "active",
            validatedAt: new Date().toISOString()
          }
        },
        { status: 403 }
      );
    }

    const accessToken = createLicenseAccessToken(license.licenseId);
    const expiresAt = new Date(Date.now() + CLIENT_SESSION_MAX_AGE_SECONDS * 1000).toISOString();

    return jsonResponse({
      success: true,
      accessToken,
      expiresAt,
      serial: {
        valid: true,
        status: license.status ?? "active",
        licenseId: license.licenseId,
        ownerName: license.ownerName,
        username: license.username,
        maxDevices: license.maxDevices,
        expiresAt: license.expiresAt,
        validatedAt: new Date().toISOString()
      },
      access,
      settings: {
        autoDraw: {
          usePixelRange: false,
          pixel: 60,
          pixelRange: {
            min: 1,
            max: 5
          }
        },
        farm: {
          usePixelRange: false,
          pixel: 60,
          pixelRange: {
            min: 1,
            max: 5
          }
        },
        imagesCollapsed: true
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          success: false,
          reason: "invalid_request_payload",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    console.error(error);
    return jsonResponse(
      {
        success: false,
        reason: "internal_api_error"
      },
      { status: 500 }
    );
  }
}

export function GET(): Response {
  return jsonResponse({
    ok: true,
    endpoint: "KGlacer Macro serial login",
    registration: "disabled"
  });
}

function resolveDeviceId(client: Record<string, unknown> | null | undefined): string {
  const localDeviceId = client?.localDeviceId;
  if (typeof localDeviceId === "string" && localDeviceId.trim().length >= 6) {
    return localDeviceId.trim();
  }
  const fingerprint = client?.deviceFingerprintHash;
  if (typeof fingerprint === "string" && fingerprint.trim().length >= 6) {
    return fingerprint.trim();
  }
  return "unknown-device";
}
