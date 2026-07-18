const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/addons.service.js for validation/error-shaping).

async function listActive(db = pool) {
  const { rows } = await db.query('SELECT * FROM addons WHERE is_active = true ORDER BY category, display_order');
  return rows;
}

async function listAll(db = pool) {
  const { rows } = await db.query('SELECT * FROM addons ORDER BY category, display_order');
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM addons WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findManyByIds(ids, db = pool) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await db.query('SELECT * FROM addons WHERE id = ANY($1::uuid[])', [ids]);
  return rows;
}

async function create(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO addons (category, name, price, description, display_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.category, data.name, data.price, data.description ?? null, data.displayOrder ?? 0]
  );
  return rows[0];
}

const UPDATABLE_COLUMNS = {
  category: 'category',
  name: 'name',
  price: 'price',
  description: 'description',
  displayOrder: 'display_order',
};

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
  if (sets.length === 0) return findById(id, db);

  values.push(id);
  const { rows } = await db.query(`UPDATE addons SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, values);
  return rows[0] || null;
}

async function setActive(id, isActive, db = pool) {
  const { rows } = await db.query('UPDATE addons SET is_active = $1 WHERE id = $2 RETURNING *', [isActive, id]);
  return rows[0] || null;
}

async function remove(id, db = pool) {
  await db.query('DELETE FROM addons WHERE id = $1', [id]);
}

module.exports = { listActive, listAll, findById, findManyByIds, create, update, setActive, remove };
