import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLicenseAccessToken: vi.fn(),
  getClientMetadata: vi.fn(),
  handleScriptCheck: vi.fn(),
  validateLicenseToken: vi.fn()
}));

vi.mock("@server/controlService", () => ({
  handleScriptCheck: mocks.handleScriptCheck,
  validateLicenseToken: mocks.validateLicenseToken
}));

vi.mock("@server/http", () => ({
  getClientMetadata: mocks.getClientMetadata
}));

vi.mock("@server/userAuth", () => ({
  LICENSE_SESSION_MAX_AGE_SECONDS: 3600,
  createLicenseAccessToken: mocks.createLicenseAccessToken
}));

import { POST } from "./route";

describe("POST /api/script/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createLicenseAccessToken.mockReturnValue("signed-session-token");
    mocks.getClientMetadata.mockResolvedValue({ ipAddress: "203.0.113.10" });
    mocks.handleScriptCheck.mockResolvedValue({ allowed: true, mode: "strict" });
    mocks.validateLicenseToken.mockResolvedValue({
      valid: true,
      status: "active",
      licenseId: "license-1",
      ownerName: "Owner",
      username: "owner",
      maxDevices: 2,
      expiresAt: null
    });
  });

  it("ignores legacy account token fields during serial login", async () => {
    const response = await POST(
      new Request("http://localhost/api/script/login", {
        method: "POST",
        body: JSON.stringify({
          serialKey: "KGM-example-token",
          scriptVersion: "5.1.12",
          currentUrl: "https://wplace.live/",
          storageKey: "kglacer-macro-settings",
          client: {
            localDeviceId: "browser-device-123456",
            userAgent: "test"
          },
          metadata: {
            accountTokenSource: "gm_cookie"
          },
          accountToken: "legacy-j-token",
          accountTokenSource: "gm_cookie",
          wplaceCookieJToken: "legacy-j-token",
          wplaceCookieJTokenSource: "gm_cookie",
          wplace: {
            me: {
              id: "9654968",
              name: "Gallardeus"
            },
            cookieJToken: "legacy-j-token",
            cookieJTokenSource: "gm_cookie"
          }
        })
      })
    );

    const payload = await response.json();
    const scriptPayload = mocks.handleScriptCheck.mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(scriptPayload).toMatchObject({
      token: "KGM-example-token",
      deviceId: "browser-device-123456",
      account: {
        id: "9654968",
        name: "Gallardeus"
      },
      metadata: {
        accountTokenUse: "post_login_account_sync_only",
        ignoredLoginAccountToken: true,
        login: true
      }
    });
    expect(scriptPayload).not.toHaveProperty("accountToken");
    expect(scriptPayload).not.toHaveProperty("wplaceCookieJToken");
  });
});
