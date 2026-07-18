const { z } = require('zod');

// NOT z.string().uuid(): zod's built-in `.uuid()` enforces strict RFC4122
// version/variant nibbles (version char in [1-8], variant char in
// [89abAB]), but Postgres's own `uuid` column type does not -- it accepts
// any 32-hex-digit value in the standard 8-4-4-4-12 grouping. Verified
// empirically: the Database Engineer's own seed data uses hand-authored
// fixture UUIDs like '11111111-1111-1111-1111-111111111101' (variant
// nibble '1', not RFC-compliant), which Postgres accepts without
// complaint but zod's `.uuid()` rejects outright. Using the stricter zod
// validator would make every seeded package/addon id fail validation on
// this API despite being valid, real rows -- so this validates only the
// shape Postgres itself enforces.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidSchema = z.string().regex(UUID_REGEX, 'Invalid id format');

module.exports = { uuidSchema, UUID_REGEX };
