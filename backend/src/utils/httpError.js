// Shared helpers for the httpError-throwing convention already established
// by auth.service.js / auth.controller.js. Services in this codebase define
// their own local `httpError()` (matching auth.service.js's existing
// convention); this module exists so the ~10 new controllers added for the
// package/quotation/payment feature don't each redefine `toHttpError`
// (auth.controller.js already has its own local copy and is left untouched,
// per the constraint not to modify existing files unless necessary).
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toHttpError(error) {
  if (error.name === 'ZodError') {
    const message = error.issues.map((issue) => issue.message).join(', ');
    return httpError(400, message);
  }
  return error;
}

module.exports = { httpError, toHttpError };
