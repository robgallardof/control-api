"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken
} from "@server/admin";
import { getClientIpFromHeaders } from "@server/http";
import { authenticateUser } from "@server/userAuth";

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  const user = await authenticateUser(username, password);

  if (!user || user.role !== "admin") {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const ipAddress = getClientIpFromHeaders(headerStore);
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(user.id, { ipAddress }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/login");
}
