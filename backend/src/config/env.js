/**
 * Fail-fast environment validation.
 *
 * This module parses `process.env` with Zod at require time and exports a
 * frozen, validated config object. Any consumer that needs an environment
 * variable should import `config` from here instead of reading
 * `process.env` directly -- that keeps validation, defaults, and coercion in
 * one place instead of scattered across ~10 call sites.
 *
 * If validation fails, this throws immediately (before the app starts
 * listening, before any DB pool is created) with every missing/invalid
 * variable named in a single message. Never log or include the *value* of a
 * secret-bearing variable (e.g. JWT_SECRET, DB_PASSWORD) in that message --
 * only its name.
 */

const { z } = require('zod');

const SENSITIVE_KEYS = new Set(['JWT_SECRET', 'DB_PASSWORD']);

// process.env leaves unset variables as `undefined` (never `null`), which
// trips Zod's generic "expected string, received undefined" invalid_type
// message instead of our friendlier, name-bearing one below. Normalize
// missing values to '' first so every required var always fails the `.min`
// check with a clear, consistent message.
function requiredString(varName, { min = 1, minMessage } = {}) {
  return z.preprocess(
    (value) => (value === undefined || value === null ? '' : value),
    z.string().min(min, minMessage ?? `${varName} is required`)
  );
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DB_HOST: requiredString('DB_HOST'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: requiredString('DB_USER'),
  DB_PASSWORD: requiredString('DB_PASSWORD'),
  DB_NAME: requiredString('DB_NAME'),

  // HS256 access/refresh tokens are signed with this. Require a non-trivial
  // length so a short/guessable value can't slip through unnoticed.
  JWT_SECRET: requiredString('JWT_SECRET', {
    min: 16,
    minMessage: 'JWT_SECRET is required and must be at least 16 characters',
  }),

  CORS_ORIGIN: z.string().default(''),
});

function formatZodError(error) {
  const lines = error.issues.map((issue) => {
    const path = issue.path.join('.') || '(root)';
    // Never echo the offending value here -- only the variable name and why
    // it failed. This branch runs for missing/invalid vars, some of which
    // (JWT_SECRET, DB_PASSWORD) are secrets.
    return `  - ${path}: ${issue.message}`;
  });

  return [
    'Invalid environment configuration. Fix the following variable(s) in backend/.env:',
    ...lines,
  ].join('\n');
}

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  const parsed = result.data;

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',

    db: Object.freeze({
      host: parsed.DB_HOST,
      port: parsed.DB_PORT,
      user: parsed.DB_USER,
      password: parsed.DB_PASSWORD,
      name: parsed.DB_NAME,
    }),

    jwtSecret: parsed.JWT_SECRET,
    corsOrigin: parsed.CORS_ORIGIN,
  };
}

const config = loadConfig();

// Exposed for tests only -- production code should always use `config` (the
// module's default export) so validation happens exactly once, at require
// time, driven by the real process.env.
config._internal = { loadConfig, envSchema, formatZodError, SENSITIVE_KEYS };

module.exports = Object.freeze(config);
