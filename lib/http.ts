/**
 * Returns the first non-empty request header value.
 * @param request The incoming request.
 * @param names Header names to inspect.
 * @returns The first header value or null.
 */
export function getFirstHeader(request: Request, names: string[]): string | null {
  for (const name of names) {
    const value = request.headers.get(name);

    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * Extracts the client IP from standard proxy and Vercel headers.
 * @param request The incoming request.
 * @returns The best available client IP string.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return getFirstHeader(request, ["x-real-ip", "x-vercel-forwarded-for"]) || "unknown";
}

/**
 * Extracts request location and browser metadata from headers.
 * @param request The incoming request.
 * @returns The normalized client metadata.
 */
export function getClientMetadata(request: Request): ClientMetadata {
  return {
    ipAddress: getClientIp(request),
    country: request.headers.get("x-vercel-ip-country"),
    region: request.headers.get("x-vercel-ip-country-region"),
    city: request.headers.get("x-vercel-ip-city"),
    userAgent: request.headers.get("user-agent")
  };
}

/**
 * Request metadata captured for auditing.
 */
export interface ClientMetadata {
  /** The detected client IP address. */
  ipAddress: string;

  /** The country code supplied by the hosting provider. */
  country: string | null;

  /** The region supplied by the hosting provider. */
  region: string | null;

  /** The city supplied by the hosting provider. */
  city: string | null;

  /** The browser user agent supplied by the request. */
  userAgent: string | null;
}
