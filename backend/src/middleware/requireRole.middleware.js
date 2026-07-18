const logger = require('../utils/logger');
const TAG = '[REQUIRE-ROLE]';

// users.role is stored uppercase in the DB ('CLIENT', 'STAFF', 'ADMIN'), so
// the JWT payload (and therefore req.user.role, set by verifyAccessToken)
// carries whatever casing the DB has -- uppercase. Callers of this
// middleware pass roles in whatever casing is convenient (lowercase reads
// better in route files); comparison is normalized to uppercase on both
// sides so this never silently breaks the way a frontend role-casing
// mismatch did previously.
function requireRole(...roles) {
  const allowed = new Set(roles.map((role) => String(role).toUpperCase()));

  return (req, res, next) => {
    const role = req.user?.role ? String(req.user.role).toUpperCase() : null;

    if (!role || !allowed.has(role)) {
      logger.info(`${TAG} Denied role "${role}" (required one of: ${[...allowed].join(', ')})`);
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }

    next();
  };
}

module.exports = { requireRole };
