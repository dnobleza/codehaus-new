/**
 * `backend/src/config/env.js` is a require-time singleton: it validates
 * `process.env` the moment it is first required and throws immediately if
 * anything is missing/invalid. To exercise both the happy path and every
 * failure mode in one file, each test mutates `process.env`, busts the
 * require cache for the module, and re-requires it fresh.
 */

import { createRequire } from 'module';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const require = createRequire(import.meta.url);
const ENV_MODULE_PATH = require.resolve('../src/config/env');

const ENV_KEYS = [
  'PORT',
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'CORS_ORIGIN',
];

const VALID_ENV = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_USER: 'test-user',
  DB_PASSWORD: 'test-password',
  DB_NAME: 'test-db',
  JWT_SECRET: 'a-sufficiently-long-test-secret-value',
};

const originalEnv = { ...process.env };

function setEnv(overrides) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, overrides);
}

function loadEnvModuleFresh() {
  delete require.cache[ENV_MODULE_PATH];
  return require('../src/config/env');
}

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, originalEnv);
  delete require.cache[ENV_MODULE_PATH];
});

describe('config/env', () => {
  it('parses a valid environment into a well-formed config object', () => {
    setEnv(VALID_ENV);

    const config = loadEnvModuleFresh();

    expect(config.jwtSecret).toBe(VALID_ENV.JWT_SECRET);
    expect(config.db).toEqual({
      host: '127.0.0.1',
      port: 5432,
      user: 'test-user',
      password: 'test-password',
      name: 'test-db',
    });
    // Unset PORT / NODE_ENV / CORS_ORIGIN fall back to defaults.
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.isProduction).toBe(false);
  });

  it('is frozen so consumers cannot mutate the shared config at runtime', () => {
    setEnv(VALID_ENV);

    const config = loadEnvModuleFresh();

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.db)).toBe(true);
  });

  it('throws when JWT_SECRET is missing', () => {
    setEnv({ ...VALID_ENV, JWT_SECRET: undefined });
    delete process.env.JWT_SECRET;

    expect(() => loadEnvModuleFresh()).toThrow(/JWT_SECRET/);
  });

  it('names every missing/invalid variable at once, not just the first', () => {
    setEnv({}); // nothing set at all

    let thrown;
    try {
      loadEnvModuleFresh();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeDefined();
    expect(thrown.message).toMatch(/JWT_SECRET/);
    expect(thrown.message).toMatch(/DB_HOST/);
    expect(thrown.message).toMatch(/DB_USER/);
    expect(thrown.message).toMatch(/DB_PASSWORD/);
    expect(thrown.message).toMatch(/DB_NAME/);
  });

  it('never includes a secret value in the thrown error message', () => {
    // A JWT_SECRET that fails the min-length check but is distinctive enough
    // that we'd definitely notice if it leaked into the error message.
    const shortSecret = 'leaked-secret-marker';
    setEnv({ ...VALID_ENV, JWT_SECRET: shortSecret.slice(0, 8) });

    let thrown;
    try {
      loadEnvModuleFresh();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeDefined();
    expect(thrown.message).toMatch(/JWT_SECRET/);
    expect(thrown.message).not.toContain(shortSecret.slice(0, 8));
    expect(thrown.message).not.toContain(VALID_ENV.DB_PASSWORD);
  });

  it('rejects an invalid NODE_ENV instead of silently accepting it', () => {
    setEnv({ ...VALID_ENV, NODE_ENV: 'staging-typo' });

    expect(() => loadEnvModuleFresh()).toThrow(/NODE_ENV/);
  });

  it('coerces PORT and DB_PORT to numbers', () => {
    setEnv({ ...VALID_ENV, PORT: '4000', DB_PORT: '6543' });

    const config = loadEnvModuleFresh();

    expect(config.port).toBe(4000);
    expect(config.db.port).toBe(6543);
  });
});
