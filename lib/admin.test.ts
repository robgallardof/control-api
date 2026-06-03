import { describe, expect, it, vi } from "vitest";

describe("admin auth helpers", () => {
  it("creates and verifies signed sessions", async () => {
    vi.stubEnv("ADMIN_API_KEY", "api-key");
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret");

    const admin = await import("./admin");
    const token = admin.createAdminSessionToken("admin");

    expect(admin.verifyAdminSessionToken(token)?.sub).toBe("admin");
    expect(admin.verifyAdminSessionToken(`${token}tampered`)).toBeNull();
  });
});
