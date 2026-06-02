import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/script/check", () => {
  it("rejects invalid client payloads with validation issues", async () => {
    const response = await POST(
      new Request("http://localhost/api/script/check", {
        method: "POST",
        body: JSON.stringify({ deviceId: "x", eventType: "check" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.allowed).toBe(false);
    expect(payload.reason).toBe("Invalid request payload.");
    expect(payload.issues.length).toBeGreaterThan(0);
  });
});
