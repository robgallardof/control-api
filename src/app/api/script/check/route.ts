import { ZodError } from 'zod'
import { handleScriptCheck } from '@server/controlService'
import { getClientMetadata } from '@server/http'
import { ScriptCheckRequestSchema } from '@server/payload'
import { jsonResponse, optionsResponse, readJson } from '../../_responses'

export const dynamic = 'force-dynamic'

export const OPTIONS = optionsResponse

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = normalizeScriptPayload(
      ScriptCheckRequestSchema.parse(await readJson(request)),
    )
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

function normalizeScriptPayload(payload: ReturnType<typeof ScriptCheckRequestSchema.parse>) {
  const accountToken = payload.accountToken ?? payload.wplaceCookieJToken ?? null
  const source =
    payload.accountTokenSource ??
    payload.wplaceCookieJTokenSource ??
    metadataString(payload.metadata, 'accountTokenSource') ??
    metadataString(payload.metadata, 'wplaceCookieJTokenSource') ??
    (accountToken ? 'detected' : 'none')

  return {
    ...payload,
    accountToken,
    metadata: {
      ...(payload.metadata ?? {}),
      accountTokenSource: source,
      hasWplaceCookieJToken: Boolean(accountToken),
      wplaceCookieJTokenSource: source,
      wplaceCookieJTokenStatus: accountToken ? 'detected' : 'unavailable',
    },
  }
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
