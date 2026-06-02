import { createPlainToken } from "../lib/hash";

/**
 * Represents a generated seed license row.
 */
interface GeneratedLicenseSeed {
  /** Friendly license owner name. */
  ownerName: string;

  /** Optional username associated with the license. */
  username: string;

  /** Raw license token to store in the test database. */
  token: string;

  /** Maximum number of allowed browser profiles or devices. */
  maxDevices: number;

  /** ISO expiration date for the generated license. */
  expiresAt: string;
}

/**
 * Reads the number of licenses to generate from the CLI arguments.
 * @returns The requested license count.
 */
function getLicenseCount(): number {
  const rawValue = process.argv[2] || "10";
  const count = Number(rawValue);

  if (!Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error("License count must be an integer between 1 and 500.");
  }

  return count;
}

/**
 * Escapes text for a single-quoted PostgreSQL string literal.
 * @param value The raw value.
 * @returns The SQL-safe value.
 */
function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Creates a generated license seed row.
 * @param index The one-based license index.
 * @returns The generated license seed row.
 */
function createSeed(index: number): GeneratedLicenseSeed {
  const paddedIndex = String(index).padStart(2, "0");

  return {
    ownerName: `Friend ${paddedIndex}`,
    username: `friend_${paddedIndex}`,
    token: createPlainToken(),
    maxDevices: 10,
    expiresAt: "2027-06-01T00:00:00Z"
  };
}

/**
 * Converts generated license seeds into an idempotent SQL insert script.
 * @param seeds The generated license rows.
 * @returns The SQL script.
 */
function toSql(seeds: GeneratedLicenseSeed[]): string {
  const values = seeds
    .map((seed) => {
      return `  (${sqlString(seed.ownerName)}, ${sqlString(seed.username)}, ${sqlString(seed.token)}, 'active', ${seed.maxDevices}, ${sqlString(seed.expiresAt)})`;
    })
    .join(",\n");

  return `-- Generated control-app license seed.\n-- Run this after supabase/schema.sql.\n\ninsert into licenses (owner_name, username, token_plain, status, max_devices, expires_at)\nvalues\n${values}\non conflict (token_plain) do update set\n  owner_name = excluded.owner_name,\n  username = excluded.username,\n  status = excluded.status,\n  max_devices = excluded.max_devices,\n  expires_at = excluded.expires_at;\n`;
}

/**
 * Generates a SQL seed script and prints it to stdout.
 */
function main(): void {
  const count = getLicenseCount();
  const seeds = Array.from({ length: count }, (_, index) => createSeed(index + 1));
  console.log(toSql(seeds));
}

main();
