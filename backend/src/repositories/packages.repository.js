const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic. Package
// activation rules, slug generation, price validation messaging, etc. all
// live in services/packages.service.js.

// Nested pages/features are assembled with LATERAL + json_agg in a single
// round trip (rather than N+1 follow-up queries per package), per the
// project's "avoid N+1 queries" performance standard.
const PACKAGE_DETAIL_QUERY = `
  SELECT p.*,
    COALESCE(pages.pages, '[]'::json) AS pages,
    COALESCE(feats.features, '[]'::json) AS features
  FROM project_packages p
  LEFT JOIN LATERAL (
    SELECT json_agg(
             json_build_object('id', pp.id, 'name', pp.name, 'displayOrder', pp.display_order)
             ORDER BY pp.display_order
           ) AS pages
    FROM package_pages pp WHERE pp.package_id = p.id
  ) pages ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(
             json_build_object('id', pf.id, 'name', pf.name, 'displayOrder', pf.display_order)
             ORDER BY pf.display_order
           ) AS features
    FROM package_features pf WHERE pf.package_id = p.id
  ) feats ON true
`;

async function listActive(db = pool) {
  const { rows } = await db.query(`${PACKAGE_DETAIL_QUERY} WHERE p.is_active = true ORDER BY p.display_order`);
  return rows;
}

async function listAll(db = pool) {
  const { rows } = await db.query(`${PACKAGE_DETAIL_QUERY} ORDER BY p.display_order`);
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${PACKAGE_DETAIL_QUERY} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

// Core row only (no nested pages/features) -- used internally for existence
// checks and pricing lookups where the nested aggregation would be wasted work.
async function findCoreById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM project_packages WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO project_packages
       (name, slug, description, base_price, estimated_timeline_min_days, estimated_timeline_max_days, display_order, is_custom, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      data.name,
      data.slug,
      data.description ?? null,
      data.basePrice ?? null,
      data.estimatedTimelineMinDays ?? null,
      data.estimatedTimelineMaxDays ?? null,
      data.displayOrder ?? 0,
      data.isCustom ?? false,
      data.createdBy ?? null,
    ]
  );
  return rows[0];
}

const UPDATABLE_COLUMNS = {
  name: 'name',
  slug: 'slug',
  description: 'description',
  basePrice: 'base_price',
  estimatedTimelineMinDays: 'estimated_timeline_min_days',
  estimatedTimelineMaxDays: 'estimated_timeline_max_days',
  displayOrder: 'display_order',
  isCustom: 'is_custom',
};

// Dynamic but safe: column names come only from the fixed whitelist above
// (never from request input), values are always parameterized.
async function update(id, fields, db = pool) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${column} = $${i}`);
      values.push(fields[key]);
      i += 1;
    }
  }
  if (sets.length === 0) return findCoreById(id, db);

  values.push(id);
  const { rows } = await db.query(`UPDATE project_packages SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows[0] || null;
}

async function setActive(id, isActive, db = pool) {
  const { rows } = await db.query('UPDATE project_packages SET is_active = $1 WHERE id = $2 RETURNING *', [
    isActive,
    id,
  ]);
  return rows[0] || null;
}

async function setThumbnail(id, url, db = pool) {
  const { rows } = await db.query('UPDATE project_packages SET thumbnail_url = $1 WHERE id = $2 RETURNING *', [
    url,
    id,
  ]);
  return rows[0] || null;
}

async function setBanner(id, url, db = pool) {
  const { rows } = await db.query('UPDATE project_packages SET banner_url = $1 WHERE id = $2 RETURNING *', [url, id]);
  return rows[0] || null;
}

async function remove(id, db = pool) {
  await db.query('DELETE FROM project_packages WHERE id = $1', [id]);
}

// --- package_pages ---

async function addPage(packageId, { name, displayOrder }, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO package_pages (package_id, name, display_order) VALUES ($1,$2,$3) RETURNING *',
    [packageId, name, displayOrder ?? 0]
  );
  return rows[0];
}

async function findPageById(pageId, db = pool) {
  const { rows } = await db.query('SELECT * FROM package_pages WHERE id = $1', [pageId]);
  return rows[0] || null;
}

async function updatePage(pageId, { name, displayOrder }, db = pool) {
  const { rows } = await db.query(
    `UPDATE package_pages SET
       name = COALESCE($1, name),
       display_order = COALESCE($2, display_order)
     WHERE id = $3 RETURNING *`,
    [name ?? null, displayOrder ?? null, pageId]
  );
  return rows[0] || null;
}

async function deletePage(pageId, db = pool) {
  await db.query('DELETE FROM package_pages WHERE id = $1', [pageId]);
}

// --- package_features ---

async function addFeature(packageId, { name, displayOrder }, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO package_features (package_id, name, display_order) VALUES ($1,$2,$3) RETURNING *',
    [packageId, name, displayOrder ?? 0]
  );
  return rows[0];
}

async function findFeatureById(featureId, db = pool) {
  const { rows } = await db.query('SELECT * FROM package_features WHERE id = $1', [featureId]);
  return rows[0] || null;
}

async function updateFeature(featureId, { name, displayOrder }, db = pool) {
  const { rows } = await db.query(
    `UPDATE package_features SET
       name = COALESCE($1, name),
       display_order = COALESCE($2, display_order)
     WHERE id = $3 RETURNING *`,
    [name ?? null, displayOrder ?? null, featureId]
  );
  return rows[0] || null;
}

async function deleteFeature(featureId, db = pool) {
  await db.query('DELETE FROM package_features WHERE id = $1', [featureId]);
}

module.exports = {
  listActive,
  listAll,
  findById,
  findCoreById,
  create,
  update,
  setActive,
  setThumbnail,
  setBanner,
  remove,
  addPage,
  findPageById,
  updatePage,
  deletePage,
  addFeature,
  findFeatureById,
  updateFeature,
  deleteFeature,
};
