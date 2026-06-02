import { jsonResponse } from "../_responses";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return jsonResponse({
    ok: true,
    name: "control-app",
    framework: "nextjs"
  });
}
