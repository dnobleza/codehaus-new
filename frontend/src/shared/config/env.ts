/**
 * Centralized environment variable access. Reads `import.meta.env` exactly
 * once, here, so the rest of the app never touches `import.meta.env` directly
 * (architecture doc §7 "Environment Configuration").
 */

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

  try {
    // Validates the value is a well-formed absolute URL; fail fast otherwise.
    new URL(raw);
  } catch {
    throw new Error(
      `Invalid VITE_API_BASE_URL: "${raw}" is not a valid URL. Check your .env file.`,
    );
  }

  return raw;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  mode: import.meta.env.MODE,
} as const;
