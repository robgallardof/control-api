import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, type AdminSessionPayload, verifyAdminSessionToken } from "@server/admin";

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const cookieStore = await cookies();
  const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  return session;
}
