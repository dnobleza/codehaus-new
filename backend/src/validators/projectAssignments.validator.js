const { z } = require('zod');

// users.user_id is BIGINT. Body fields arrive as JSON (already numeric where
// the client sends a number) and route params always arrive as strings, so
// z.coerce.number() covers both call sites (POST body and the DELETE
// :userId param) the same way payments.validator.js coerces multipart
// numeric fields.
const assignUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

module.exports = { assignUserSchema };
