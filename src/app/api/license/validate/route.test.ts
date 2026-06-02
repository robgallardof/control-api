import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/license/validate", () => {
  it("rejects malformed payloads before touching storage", async () => {
    const response = await POST(
      new Request("http://localhost/api/license/validate", {
        method: "POST",
        body: JSON.stringify({ token: "" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.valid).toBe(false);
    expect(payload.reason).toBe("invalid_request_payload");
  });
});
