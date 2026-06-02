import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isAdminKeyValid, verifyAdminSessionToken } from "@server/admin";

export function isAdminRequestAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-key");

  if (apiKey && isAdminKeyValid(apiKey)) {
    return true;
  }

  return Boolean(verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value));
}

export function assertAdminRequest(request: NextRequest): void {
  if (!isAdminRequestAuthorized(request)) {
    throw new Error("Unauthorized admin request.");
  }
}
