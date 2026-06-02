import { describe, expect, it, vi } from "vitest";

describe("admin auth helpers", () => {
  it("validates configured credentials and signed sessions", async () => {
    vi.stubEnv("ADMIN_USERNAME", "admin");
    vi.stubEnv("ADMIN_PASSWORD", "secret123");
    vi.stubEnv("ADMIN_API_KEY", "api-key");
    vi.stubEnv("ADMIN_SESSION_SECRET", "session-secret");

    const admin = await import("./admin");
    const token = admin.createAdminSessionToken("admin");

    expect(admin.areAdminCredentialsValid("admin", "secret123")).toBe(true);
    expect(admin.areAdminCredentialsValid("admin", "wrongpass")).toBe(false);
    expect(admin.verifyAdminSessionToken(token)?.sub).toBe("admin");
    expect(admin.verifyAdminSessionToken(`${token}tampered`)).toBeNull();
  });
});
