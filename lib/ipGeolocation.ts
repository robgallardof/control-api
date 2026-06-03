const IP_API_FIELDS = [
  "status",
  "message",
  "country",
  "countryCode",
  "region",
  "regionName",
  "city",
  "zip",
  "lat",
  "lon",
  "timezone",
  "isp",
  "org",
  "as",
  "query",
  "mobile",
  "proxy",
  "hosting"
].join(",");

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ERROR_CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2500;

let rateLimitedUntil = 0;
const cache = new Map<string, { expiresAt: number; value: IpGeolocationResult | null }>();

export interface IpGeolocationResult {
  status: "success" | "fail" | "unavailable";
  source: "ip-api";
  query: string;
  message?: string | null;
  countryName?: string | null;
  countryCode?: string | null;
  region?: string | null;
  regionName?: string | null;
  city?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  isp?: string | null;
  organization?: string | null;
  asn?: string | null;
  mobile?: boolean | null;
  proxy?: boolean | null;
  hosting?: boolean | null;
}

/**
 * Resolves public IP geolocation with ip-api.com and keeps a small in-memory cache.
 * The free endpoint is HTTP-only and rate-limited, so this must run server-side.
 */
export async function lookupIpGeolocation(ipAddress: string): Promise<IpGeolocationResult | null> {
  const ip = normalizeIp(ipAddress);

  if (!ip || !isLookupAllowed(ip)) {
    return null;
  }

  const now = Date.now();
  const cached = cache.get(ip);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (rateLimitedUntil > now) {
    return {
      status: "unavailable",
      source: "ip-api",
      query: ip,
      message: "rate_limited"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${encodeURIComponent(IP_API_FIELDS)}&lang=es`,
      {
        cache: "no-store",
        signal: controller.signal
      }
    );
    updateRateLimit(response.headers);

    if (!response.ok) {
      const value: IpGeolocationResult = {
        status: "unavailable",
        source: "ip-api",
        query: ip,
        message: `http_${response.status}`
      };
      cache.set(ip, { expiresAt: now + ERROR_CACHE_TTL_MS, value });
      return value;
    }

    const body = (await response.json()) as Record<string, unknown>;
    const value = normalizeIpApiResponse(ip, body);
    cache.set(ip, {
      expiresAt: now + (value.status === "success" ? CACHE_TTL_MS : ERROR_CACHE_TTL_MS),
      value
    });
    return value;
  } catch (error) {
    const value: IpGeolocationResult = {
      status: "unavailable",
      source: "ip-api",
      query: ip,
      message: error instanceof Error ? error.name : "fetch_failed"
    };
    cache.set(ip, { expiresAt: now + ERROR_CACHE_TTL_MS, value });
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeIpApiResponse(ip: string, body: Record<string, unknown>): IpGeolocationResult {
  const status = stringValue(body.status);

  if (status !== "success") {
    return {
      status: "fail",
      source: "ip-api",
      query: stringValue(body.query) || ip,
      message: stringValue(body.message) || "lookup_failed"
    };
  }

  return {
    status: "success",
    source: "ip-api",
    query: stringValue(body.query) || ip,
    countryName: stringValue(body.country),
    countryCode: stringValue(body.countryCode),
    region: stringValue(body.region),
    regionName: stringValue(body.regionName),
    city: stringValue(body.city),
    zip: stringValue(body.zip),
    latitude: numberValue(body.lat),
    longitude: numberValue(body.lon),
    timezone: stringValue(body.timezone),
    isp: stringValue(body.isp),
    organization: stringValue(body.org),
    asn: stringValue(body.as),
    mobile: booleanValue(body.mobile),
    proxy: booleanValue(body.proxy),
    hosting: booleanValue(body.hosting)
  };
}

function updateRateLimit(headers: Headers): void {
  const remaining = Number(headers.get("X-Rl"));
  const ttl = Number(headers.get("X-Ttl"));

  if (Number.isFinite(remaining) && remaining <= 0 && Number.isFinite(ttl) && ttl > 0) {
    rateLimitedUntil = Date.now() + ttl * 1000;
  }
}

function normalizeIp(value: string): string {
  const ip = value.trim();

  if (!ip || ip === "unknown") {
    return "";
  }

  if (ip.startsWith("::ffff:")) {
    return ip.slice("::ffff:".length);
  }

  return ip;
}

function isLookupAllowed(ip: string): boolean {
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80:")
  ) {
    return false;
  }

  const parts = ip.split(".").map((part) => Number(part));

  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    const [first, second] = parts;

    if (first === 172 && second >= 16 && second <= 31) return false;
    if (first === 100 && second >= 64 && second <= 127) return false;
    if (first === 0 || first >= 224) return false;
  }

  return true;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
