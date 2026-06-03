import { z, ZodError } from 'zod'
import { validateLicenseToken } from '@server/controlService'
import { jsonResponse, optionsResponse, readJson } from '../../_responses'

export const dynamic = 'force-dynamic'

export const OPTIONS = optionsResponse

const LicenseValidationRequestSchema = z.object({
  token: z.string().trim().min(1).max(256),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = LicenseValidationRequestSchema.parse(
      await readJson(request),
    )
    const result = await validateLicenseToken(payload.token)
    return jsonResponse(result, { status: result.valid ? 200 : 403 })
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          valid: false,
          reason: 'invalid_request_payload',
          issues: error.issues,
        },
        { status: 400 },
      )
    }

    console.error(error)
    return jsonResponse(
      {
        valid: false,
        reason: 'internal_api_error',
      },
      { status: 500 },
    )
  }
}
