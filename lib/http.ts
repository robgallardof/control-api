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
export async function getClientMetadata(request: Request): Promise<ClientMetadata> {
  const ipAddress = getClientIp(request);
  const ipGeo = await lookupIpGeolocation(ipAddress);
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  const vercelRegion = request.headers.get("x-vercel-ip-country-region");
  const vercelCity = decodeHeaderValue(request.headers.get("x-vercel-ip-city"));

  return {
    ipAddress,
    country: ipGeo?.countryCode ?? vercelCountry,
    countryName: ipGeo?.countryName ?? null,
    region: ipGeo?.region ?? vercelRegion,
    regionName: ipGeo?.regionName ?? null,
    city: ipGeo?.city ?? vercelCity,
    zip: ipGeo?.zip ?? null,
    latitude: ipGeo?.latitude ?? null,
    longitude: ipGeo?.longitude ?? null,
    timezone: ipGeo?.timezone ?? null,
    isp: ipGeo?.isp ?? null,
    organization: ipGeo?.organization ?? null,
    asn: ipGeo?.asn ?? null,
    geoSource: ipGeo?.source ?? (vercelCountry || vercelRegion || vercelCity ? "vercel" : null),
    geoStatus: ipGeo?.status ?? null,
    ipGeolocation: ipGeo,
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

  /** The localized country name from IP geolocation. */
  countryName: string | null;

  /** The region supplied by the hosting provider. */
  region: string | null;

  /** The localized region/state name from IP geolocation. */
  regionName: string | null;

  /** The city supplied by the hosting provider. */
  city: string | null;

  /** The ZIP/postal sector returned by IP geolocation when available. */
  zip: string | null;

  /** Latitude returned by IP geolocation. */
  latitude: number | null;

  /** Longitude returned by IP geolocation. */
  longitude: number | null;

  /** Timezone returned by IP geolocation. */
  timezone: string | null;

  /** ISP returned by IP geolocation. */
  isp: string | null;

  /** Organization returned by IP geolocation. */
  organization: string | null;

  /** Autonomous system string returned by IP geolocation. */
  asn: string | null;

  /** Geo source used for this request. */
  geoSource: string | null;

  /** Geo lookup status. */
  geoStatus: string | null;

  /** Full normalized IP geolocation payload. */
  ipGeolocation: IpGeolocationResult | null;

  /** The browser user agent supplied by the request. */
  userAgent: string | null;
}

function decodeHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
import { lookupIpGeolocation, type IpGeolocationResult } from "./ipGeolocation";
