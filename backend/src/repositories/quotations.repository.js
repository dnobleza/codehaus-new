const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (pricing
// calculation, transaction orchestration, and status-transition rules all
// live in services/quotations.service.js). Every function accepts the pg
// client/pool as its last argument (defaulting to the shared pool) so
// callers running inside a BEGIN/COMMIT transaction can pass their
// checked-out client through.

async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO quotations
       (project_id, package_id, base_price, estimated_timeline_min_days, estimated_timeline_max_days,
        discount_amount, total_amount, status, sent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      data.projectId,
      data.packageId ?? null,
      data.basePrice,
      data.estimatedTimelineMinDays ?? null,
      data.estimatedTimelineMaxDays ?? null,
      data.discountAmount ?? 0,
      data.totalAmount,
      data.status ?? 'draft',
      data.sentAt ?? null,
    ]
  );
  return rows[0];
}

async function insertAddon({ quotationId, addonId, priceAtTime }, db = pool) {
  await db.query('INSERT INTO quotation_addons (quotation_id, addon_id, price_at_time) VALUES ($1,$2,$3)', [
    quotationId,
    addonId,
    priceAtTime,
  ]);
}

async function clearAddons(quotationId, db = pool) {
  await db.query('DELETE FROM quotation_addons WHERE quotation_id = $1', [quotationId]);
}

async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM quotations WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByIdForProject(id, projectId, db = pool) {
  const { rows } = await db.query('SELECT * FROM quotations WHERE id = $1 AND project_id = $2', [id, projectId]);
  return rows[0] || null;
}

async function listByProjectWithAddons(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT q.*,
       COALESCE(a.addons, '[]'::json) AS addons
     FROM quotations q
     LEFT JOIN LATERAL (
       SELECT json_agg(
                json_build_object('addonId', qa.addon_id, 'name', ad.name, 'category', ad.category, 'priceAtTime', qa.price_at_time)
              ) AS addons
       FROM quotation_addons qa
       JOIN addons ad ON ad.id = qa.addon_id
       WHERE qa.quotation_id = q.id
     ) a ON true
     WHERE q.project_id = $1
     ORDER BY q.created_at DESC`,
    [projectId]
  );
  return rows;
}

async function updateCore(id, data, db = pool) {
  const { rows } = await db.query(
    `UPDATE quotations SET
       package_id = $1,
       base_price = $2,
       estimated_timeline_min_days = $3,
       estimated_timeline_max_days = $4,
       discount_amount = $5,
       total_amount = $6
     WHERE id = $7
     RETURNING *`,
    [
      data.packageId ?? null,
      data.basePrice,
      data.estimatedTimelineMinDays ?? null,
      data.estimatedTimelineMaxDays ?? null,
      data.discountAmount ?? 0,
      data.totalAmount,
      id,
    ]
  );
  return rows[0] || null;
}

async function setStatus(id, { status, sentAt, respondedAt }, db = pool) {
  const { rows } = await db.query(
    `UPDATE quotations SET
       status = $1,
       sent_at = COALESCE($2, sent_at),
       responded_at = COALESCE($3, responded_at)
     WHERE id = $4
     RETURNING *`,
    [status, sentAt ?? null, respondedAt ?? null, id]
  );
  return rows[0] || null;
}

module.exports = {
  insert,
  insertAddon,
  clearAddons,
  findById,
  findByIdForProject,
  listByProjectWithAddons,
  updateCore,
  setStatus,
};
