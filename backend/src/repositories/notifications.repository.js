const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business rules (who gets notified
// and what the copy says lives in services/notifications.service.js). Every
// function takes the pg client/pool as its last argument (defaulting to the
// shared pool) so callers running inside a BEGIN/COMMIT can pass their
// checked-out client through -- which matters here: a notification must be
// written in the SAME transaction as the event that caused it.

async function insert({ userId, projectId, eventType, title, body, link }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, project_id, event_type, title, body, link)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [userId, projectId ?? null, eventType, title, body, link ?? null]
  );
  return rows[0];
}

async function listByUser(userId, { limit = 30 } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function countUnread(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return rows[0].count;
}

// Scoped by user_id as well as id: a client must never be able to mark
// someone else's notification read by guessing an id. Returns null when the
// row doesn't exist OR isn't theirs -- the service turns both into a 404
// rather than distinguishing them, so the endpoint can't be used to probe
// which ids exist.
async function markRead(id, userId, db = pool) {
  const { rows } = await db.query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return rows[0] || null;
}

async function markAllRead(userId, db = pool) {
  const { rows } = await db.query(
    `UPDATE notifications
     SET read_at = now()
     WHERE user_id = $1 AND read_at IS NULL
     RETURNING id`,
    [userId]
  );
  return rows.length;
}

module.exports = { insert, listByUser, countUnread, markRead, markAllRead };
