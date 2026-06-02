import { createPlainToken, hashToken } from "../src/lib/hash";
import { supabaseAdmin } from "../src/lib/supabaseAdmin";

/**
 * Reads a required CLI argument by index.
 * @param index The argument index.
 * @param name The argument name for error messages.
 * @returns The argument value.
 */
function getArg(index: number, name: string): string {
  const value = process.argv[index];

  if (!value) {
    throw new Error(`Missing argument: ${name}`);
  }

  return value;
}

/**
 * Returns the default expiration date for generated test licenses.
 * @returns An ISO date one year from now.
 */
function getDefaultExpiration(): string {
  const expiration = new Date();
  expiration.setUTCFullYear(expiration.getUTCFullYear() + 1);
  return expiration.toISOString();
}

/**
 * Creates a license token and stores both raw token and hash.
 */
async function main(): Promise<void> {
  const ownerName = getArg(2, "ownerName");
  const username = process.argv[3] || null;
  const maxDevices = Number(process.argv[4] || "10");
  const expiresAt = process.argv[5] || getDefaultExpiration();
  const token = process.argv[6] || createPlainToken();
  const tokenHash = hashToken(token);

  const { data, error } = await supabaseAdmin
    .from("licenses")
    .insert({
      owner_name: ownerName,
      username,
      max_devices: maxDevices,
      expires_at: expiresAt === "null" ? null : expiresAt,
      token_plain: token,
      token_hash: tokenHash
    })
    .select("id, owner_name, username, token_plain, max_devices, expires_at, created_at")
    .single();

  if (error) {
    throw error;
  }

  console.log("License created:");
  console.log(data);
  console.log("\nRaw token:");
  console.log(token);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
