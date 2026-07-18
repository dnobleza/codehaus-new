const pool = require('../config/database');

// Raw, parameterized data access only -- no business rules here. project_statuses
// is a flat lookup table (see docs/superpowers/specs/2026-07-17-package-quotation-schema-design.md),
// so "listAll"/"exists" is the entire surface this table needs.

async function listAll(db = pool) {
  const { rows } = await db.query(
    'SELECT code, label, display_order, is_terminal FROM project_statuses ORDER BY display_order'
  );
  return rows;
}

async function exists(code, db = pool) {
  const { rows } = await db.query('SELECT 1 FROM project_statuses WHERE code = $1', [code]);
  return rows.length > 0;
}

module.exports = { listAll, exists };
