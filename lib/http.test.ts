import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClientMetadata } from "./http";
import { lookupIpGeolocation } from "./ipGeolocation";

vi.mock("./ipGeolocation", () => ({ lookupIpGeolocation: vi.fn() }));

describe("client geolocation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses Vercel location without an external lookup", async () => {
    const result = await getClientMetadata(new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "203.0.113.1",
        "x-vercel-ip-country": "MX",
        "x-vercel-ip-country-region": "CMX",
        "x-vercel-ip-city": "Ciudad%20de%20M%C3%A9xico"
      }
    }));

    expect(lookupIpGeolocation).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      country: "MX", region: "CMX", city: "Ciudad de México", geoSource: "vercel",
      ipGeolocation: null
    });
  });

  it("keeps external enrichment when provider country is unavailable", async () => {
    vi.mocked(lookupIpGeolocation).mockResolvedValue({
      status: "success", source: "ip-api", query: "203.0.113.1", countryCode: "MX", isp: "Example ISP"
    });
    const result = await getClientMetadata(new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1" }
    }));
    expect(lookupIpGeolocation).toHaveBeenCalledWith("203.0.113.1");
    expect(result).toMatchObject({ country: "MX", isp: "Example ISP", geoSource: "ip-api" });
  });

  it("retains partial provider location when fallback lookup fails", async () => {
    vi.mocked(lookupIpGeolocation).mockResolvedValue(null);
    const result = await getClientMetadata(new Request("https://example.com", {
      headers: { "x-vercel-ip-city": "Monterrey" }
    }));
    expect(result).toMatchObject({ country: null, city: "Monterrey", geoSource: "vercel" });
  });
});
