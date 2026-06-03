import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-admin-key',
}

function applyDefaultHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store')
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export function jsonResponse(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init)
  return applyDefaultHeaders(response)
}

export function optionsResponse(): NextResponse {
  return applyDefaultHeaders(new NextResponse(null, { status: 204 }))
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text()
  return text ? JSON.parse(text) : {}
}
