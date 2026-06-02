/**
 * Reads a required environment variable.
 * @param key The environment variable name.
 * @returns The configured environment variable value.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

/**
 * Reads an optional environment variable with a default value.
 * @param key The environment variable name.
 * @param fallback The fallback value to use when the variable is not configured.
 * @returns The configured value or the fallback value.
 */
export function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}
