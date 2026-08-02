const usersService = require('../services/users.service');
const logger = require('../utils/logger');
const TAG = '[ADMIN-USERS-CONTROLLER]';

function toHttpError(error) {
  return error;
}

/**
 * Backs the project assignment picker: the active staff and admin users an
 * admin can put on a delivery team.
 *
 * Deliberately narrow. This is not a general user directory and must not grow
 * into one without a fresh look at what it exposes -- it returns names and
 * emails, and the route is admin-only for that reason.
 */
exports.listAssignable = async (req, res, next) => {
  try {
    const users = await usersService.listAssignableUsers();
    logger.info(`${TAG} Listed ${users.length} assignable users`);
    res
      .status(200)
      .json({ success: true, message: 'Assignable users retrieved successfully', data: users });
  } catch (error) {
    next(toHttpError(error));
  }
};
