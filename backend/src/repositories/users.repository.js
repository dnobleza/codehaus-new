const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/users.service.js).

/*
  Identity is split across two tables: `users` holds the credential and role,
  `registration` holds the person (name, email, contact). They join on
  `registration_uuid`. Same join shape as auth.service.js's login lookup and
  projectAssignments.repository.js#listByProject.

  `password_hash` is never selected here. These rows are for pickers and
  directories; nothing downstream of this file has any reason to hold a hash.
*/
const USER_SELECT = `
  SELECT u.user_id, u.role, u.is_active,
         r.first_name, r.last_name, r.email
  FROM users u
  JOIN registration r ON r.registration_uuid = u.registration_uuid`;

// Active users of a given role, name-ordered for direct use in a picker.
// `role` is compared uppercase because that is how the column stores it.
async function listByRole(role, db = pool) {
  const { rows } = await db.query(
    `${USER_SELECT}
     WHERE UPPER(u.role) = UPPER($1) AND u.is_active = TRUE
     ORDER BY r.first_name ASC, r.last_name ASC`,
    [role]
  );
  return rows;
}

async function findById(userId, db = pool) {
  const { rows } = await db.query(`${USER_SELECT} WHERE u.user_id = $1`, [userId]);
  return rows[0] || null;
}

module.exports = { listByRole, findById };
