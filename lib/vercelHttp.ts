import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ClientMetadata } from "./http";

/**
 * Reads a single header value from a Vercel request.
 * @param request The incoming Vercel request.
 * @param name The header name to read.
 * @returns The first header value or null.
 */
export function getRequestHeader(request: VercelRequest, name: string): string | null {
  const value = request.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

/**
 * Reads a JSON request body from Vercel. Vercel usually parses JSON already,
 * but this also supports raw string bodies for local testing tools.
 * @param request The incoming Vercel request.
 * @returns The parsed request body.
 */
export function getJsonBody(request: VercelRequest): unknown {
  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  return request.body ?? {};
}

/**
 * Extracts the client IP from standard proxy and Vercel headers.
 * @param request The incoming Vercel request.
 * @returns The best available client IP string.
 */
export function getClientIp(request: VercelRequest): string {
  const forwardedFor = getRequestHeader(request, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return getRequestHeader(request, "x-real-ip") || getRequestHeader(request, "x-vercel-forwarded-for") || "unknown";
}

/**
 * Extracts request location and browser metadata from Vercel headers.
 * @param request The incoming Vercel request.
 * @returns The normalized client metadata.
 */
export function getClientMetadata(request: VercelRequest): ClientMetadata {
  return {
    ipAddress: getClientIp(request),
    country: getRequestHeader(request, "x-vercel-ip-country"),
    region: getRequestHeader(request, "x-vercel-ip-country-region"),
    city: getRequestHeader(request, "x-vercel-ip-city"),
    userAgent: getRequestHeader(request, "user-agent")
  };
}

/**
 * Sends a JSON response with no-store headers.
 * @param response The outgoing Vercel response.
 * @param statusCode The HTTP status code.
 * @param body The JSON response body.
 */
export function sendJson(response: VercelResponse, statusCode: number, body: unknown): void {
  response.setHeader("Cache-Control", "no-store");
  response.status(statusCode).json(body);
}
