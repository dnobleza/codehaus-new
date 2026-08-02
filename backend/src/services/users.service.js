const usersRepo = require('../repositories/users.repository');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');
const TAG = '[USERS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/*
  Roles that may be assigned to a project's delivery team.

  STAFF is the obvious one -- assignment is what scopes a staff member's
  project list (projects.repository.js#listAssignedTo). ADMIN is included
  because an owner-operator at a small agency delivers work too, and admin
  already sees every project regardless, so adding them to a team changes
  presentation rather than access.

  CLIENT is excluded: a client reaching their own project goes through
  `client_id` ownership, never through project_assignments, so assigning one
  would be meaningless at best and misleading on a team roster at worst.
*/
const ASSIGNABLE_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/** Active users eligible to be put on a project team, for the assignment picker. */
async function listAssignableUsers() {
  const lists = await Promise.all(ASSIGNABLE_ROLES.map((role) => usersRepo.listByRole(role)));
  // Staff first (the common case), admins after; each already name-ordered.
  const users = lists.flat();
  logger.info(`${TAG} Listed ${users.length} assignable users`);
  return users;
}

/**
 * Throws unless `userId` exists, is active, and holds an assignable role.
 *
 * Before a users repository existed, `assignUserToProject` leaned on the FK
 * violation as its existence check, which could only ever answer "is there a
 * row" -- it could not tell a staff member from a client, so a client could be
 * added to a delivery team. This makes that an explicit, answerable check.
 */
async function assertAssignable(userId) {
  const user = await usersRepo.findById(userId);
  if (!user) throw httpError(404, 'User not found');
  if (!user.is_active) throw httpError(409, 'This user account is inactive');

  const role = String(user.role || '').toUpperCase();
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw httpError(409, 'Only staff and admin users can be assigned to a project');
  }
  return user;
}

module.exports = { listAssignableUsers, assertAssignable, ASSIGNABLE_ROLES };
