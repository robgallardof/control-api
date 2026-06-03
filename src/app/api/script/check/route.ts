import { ZodError } from 'zod'
import { handleScriptCheck } from '@server/controlService'
import { getClientMetadata } from '@server/http'
import { ScriptCheckRequestSchema } from '@server/payload'
import { jsonResponse, optionsResponse, readJson } from '../../_responses'

export const dynamic = 'force-dynamic'

export const OPTIONS = optionsResponse

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = ScriptCheckRequestSchema.parse(await readJson(request))
    const result = await handleScriptCheck(payload, await getClientMetadata(request))
    return jsonResponse(result, { status: result.allowed ? 200 : 403 })
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          allowed: false,
          reason: 'Invalid request payload.',
          issues: error.issues,
        },
        { status: 400 },
      )
    }

    console.error(error)
    return jsonResponse(
      {
        allowed: false,
        reason: 'Internal API error.',
      },
      { status: 500 },
    )
  }
}
