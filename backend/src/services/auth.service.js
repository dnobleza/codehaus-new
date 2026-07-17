const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');
const TAG = '[AUTH-SERVICE]';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function issueAccessToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

async function issueRefreshToken(client, userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await client.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return { rawToken, expiresAt };
}

async function issueTokenPair(client, user) {
  const accessToken = issueAccessToken(user);
  const refreshToken = await issueRefreshToken(client, user.id);
  return { accessToken, refreshToken };
}

async function registerUser({ firstName, middleName, lastName, email, password, contactNo, address }) {
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query('SELECT 1 FROM registration WHERE email = $1', [email]);
    if (existing.length > 0) {
      throw httpError(409, 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user;
    let tokens;
    try {
      await client.query('BEGIN');

      const { rows: registrationRows } = await client.query(
        `INSERT INTO registration (first_name, middle_name, last_name, email, contact_no, address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING registration_uuid`,
        [firstName, middleName, lastName, email, contactNo ?? null, address ?? null]
      );
      const { registration_uuid: registrationUuid } = registrationRows[0];

      const { rows: userRows } = await client.query(
        `INSERT INTO users (registration_uuid, password_hash)
         VALUES ($1, $2)
         RETURNING user_id, role`,
        [registrationUuid, passwordHash]
      );

      user = {
        id: userRows[0].user_id,
        role: userRows[0].role,
        email,
        firstName,
        lastName,
      };
      tokens = await issueTokenPair(client, user);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        throw httpError(409, 'Email is already registered');
      }
      throw error;
    }

    logger.info(`${TAG} Registered user ${user.id}`);
    return { user, ...tokens };
  } finally {
    client.release();
  }
}

async function loginUser({ email, password }) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT u.user_id, u.password_hash, u.role, u.is_active, r.email, r.first_name, r.last_name
       FROM users u
       JOIN registration r ON r.registration_uuid = u.registration_uuid
       WHERE r.email = $1`,
      [email]
    );
    const row = rows[0];

    const passwordHash = row ? row.password_hash : '$2b$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsal';
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!row || !passwordMatches || !row.is_active) {
      throw httpError(401, 'Invalid email or password');
    }

    const user = {
      id: row.user_id,
      role: row.role,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    };

    await client.query('UPDATE users SET last_login = now() WHERE user_id = $1', [user.id]);

    const tokens = await issueTokenPair(client, user);
    logger.info(`${TAG} Logged in user ${user.id}`);
    return { user, ...tokens };
  } finally {
    client.release();
  }
}

async function refreshSession(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw httpError(401, 'Missing refresh token');
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      // Atomic claim-and-revoke: only the first caller to present this exact
      // token wins the row, closing the check-then-act race a plain SELECT
      // followed by UPDATE would leave open under concurrent requests.
      const { rows: claimed } = await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = now()
         WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
         RETURNING id, user_id`,
        [tokenHash]
      );

      if (claimed.length === 0) {
        // Token already rotated/revoked once before but presented again:
        // that's a replay signal (theft), not just an expired token. Kill
        // every live session for the account it belonged to.
        const { rows: reused } = await client.query(
          'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NOT NULL',
          [tokenHash]
        );
        if (reused.length > 0) {
          await client.query(
            'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
            [reused[0].user_id]
          );
          await client.query('COMMIT');
          logger.error(`${TAG} Refresh token reuse detected for user ${reused[0].user_id}, revoked all sessions`);
          throw httpError(403, 'Refresh token is invalid or expired');
        }
        await client.query('ROLLBACK');
        throw httpError(403, 'Refresh token is invalid or expired');
      }

      const { rows: userRows } = await client.query(
        `SELECT u.user_id, u.role, u.is_active, r.email, r.first_name, r.last_name
         FROM users u
         JOIN registration r ON r.registration_uuid = u.registration_uuid
         WHERE u.user_id = $1`,
        [claimed[0].user_id]
      );
      const userRow = userRows[0];

      if (!userRow || !userRow.is_active) {
        throw httpError(403, 'Refresh token is invalid or expired');
      }

      const user = {
        id: userRow.user_id,
        role: userRow.role,
        email: userRow.email,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
      };
      const tokens = await issueTokenPair(client, user);
      await client.query('COMMIT');

      logger.info(`${TAG} Rotated refresh token for user ${user.id}`);
      return { user, ...tokens };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    client.release();
  }
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;

  const tokenHash = hashRefreshToken(rawRefreshToken);
  await pool.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
    tokenHash,
  ]);
  logger.info(`${TAG} Refresh token revoked`);
}

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logout,
  REFRESH_TOKEN_TTL_MS,
};
