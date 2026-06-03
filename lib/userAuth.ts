import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { getOptionalEnv, getRequiredEnv } from "./env";
import { safeEquals } from "./hash";
import { getSupabaseAdmin } from "./supabaseAdmin";

export const CLIENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  role: string;
  is_active: boolean;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
}

export interface ClientSessionPayload {
  type: "user" | "license";
  sub: string;
  username?: string;
  role?: string;
  licenseId: string | null;
  exp: number;
  nonce: string;
}

export async function authenticateUser(identifier: string, password: string): Promise<AuthenticatedUser | null> {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier || !password) return null;

  const user =
    (await findUserByColumn("username", normalizedIdentifier)) ??
    (await findUserByColumn("email", normalizedIdentifier));

  if (!user || !user.is_active) return null;
  if (!verifyPasswordHash(password, user.password_hash)) return null;

  return toAuthenticatedUser(user);
}

export async function getUserById(id: string): Promise<AuthenticatedUser | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, username, email, password_hash, role, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toAuthenticatedUser(data as UserRecord) : null;
}

export function createClientAccessToken(user: AuthenticatedUser, licenseId: string | null): string {
  const payload: ClientSessionPayload = {
    type: "user",
    sub: user.id,
    username: user.username,
    role: user.role,
    licenseId,
    exp: Math.floor(Date.now() / 1000) + CLIENT_SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url")
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signClientSessionPayload(encodedPayload)}`;
}

export function createLicenseAccessToken(licenseId: string): string {
  const payload: ClientSessionPayload = {
    type: "license",
    sub: licenseId,
    licenseId,
    exp: Math.floor(Date.now() / 1000) + CLIENT_SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url")
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signClientSessionPayload(encodedPayload)}`;
}

export function verifyClientAccessToken(token: string | null | undefined): ClientSessionPayload | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEquals(signClientSessionPayload(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ClientSessionPayload;
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (payload.type !== "user" && payload.type !== "license") return null;
    if (payload.type === "license" && !payload.licenseId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createPbkdf2PasswordHash(password: string): string {
  const iterations = 210000;
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2_sha256$${iterations}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

function verifyPasswordHash(password: string, storedHash: string): boolean {
  const [scheme, iterationsRaw, saltRaw, hashRaw] = storedHash.split("$");
  if (scheme !== "pbkdf2_sha256" || !iterationsRaw || !saltRaw || !hashRaw) {
    return false;
  }

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;

  try {
    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(hashRaw, "base64url");
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function findUserByColumn(column: "username" | "email", value: string): Promise<UserRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, username, email, password_hash, role, is_active")
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;
  return (data as UserRecord | null) ?? null;
}

function toAuthenticatedUser(user: UserRecord): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.is_active
  };
}

function signClientSessionPayload(encodedPayload: string): string {
  return createHmac("sha256", getClientSessionSecret()).update(encodedPayload).digest("base64url");
}

function getClientSessionSecret(): string {
  return getOptionalEnv("CLIENT_SESSION_SECRET", getRequiredEnv("TOKEN_PEPPER"));
}
