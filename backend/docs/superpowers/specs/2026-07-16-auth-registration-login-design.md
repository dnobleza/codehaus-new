# Registration & Login — Design

Date: 2026-07-16
Status: Approved

## Context

Backend is an early-stage Express 5 + PostgreSQL (`pg` Pool) app. Existing layered
structure: `src/routes`, `src/controllers`, `src/middleware`, `src/utils`. No data
model, no auth. This spec adds user registration and login with JWT access/refresh
tokens.

Stack decisions locked in during brainstorming:

- Data layer: raw SQL via the existing `pg` Pool (`src/config/database.js`), not
  Prisma. Prisma/`@prisma/client` are installed but unconfigured (no schema) —
  out of scope, avoids dependency-bloat rabbit hole.
- Token strategy: short-lived access JWT + long-lived refresh JWT, refresh stored
  server-side (DB-backed) so logout/revocation actually work.
- Out of scope: password reset, email verification (separate feature, needs an
  email provider decision).

## Data Model

**Correction (post-approval):** at implementation time the target DB already had
a `registration` + `users` schema (not created by this feature) — discovered
when the originally-planned `001_create_users.sql` migration failed with
`relation "users" already exists`. The design below was adapted in place to
that real schema rather than replacing it.

Existing tables (unchanged by this feature):

```sql
registration (
  registration_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR NOT NULL,
  middle_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  contact_no VARCHAR,
  address TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

users (
  user_id BIGINT PRIMARY KEY (serial),
  registration_uuid UUID NOT NULL REFERENCES registration(registration_uuid) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'CLIENT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

Only new table added, `db/migrations/001_create_refresh_tokens.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

Applied by `src/db/migrate.js`, a small runner that tracks applied filenames
in a `schema_migrations` table (no ORM/migration framework in use, so this is
the minimal versioning mechanism per the postgresql skill's "every schema
change must be versioned" rule).

Register writes to both `registration` and `users` in a single transaction.
JWT `sub` claim and `req.user.id` use `users.user_id` (the auth identity), not
`registration_uuid`.

## Components

```
src/
  db/
    migrate.js                    # applies pending db/migrations/*.sql, tracks in schema_migrations
  routes/
    auth.route.js                 # POST /auth/register, /auth/login, /auth/refresh, /auth/logout
  controllers/
    auth.controller.js            # thin: validate via zod, call service, shape response
  services/
    auth.service.js                # business logic: hashing, token issuance, DB queries
  middleware/
    auth.middleware.js            # verifyAccessToken (protects future routes)
    rateLimiter.middleware.js     # express-rate-limit config for auth routes
  validators/
    auth.validator.js             # zod schemas: registerSchema, loginSchema
db/
  migrations/
    001_create_users.sql
    002_create_refresh_tokens.sql
```

Each unit's contract:

- `auth.validator.js` — pure zod schemas, no I/O. Input: raw `req.body`. Output:
  parsed/typed object or throws `ZodError`.
- `auth.service.js` — no knowledge of Express (`req`/`res`). Functions:
  `registerUser({email, password})`, `loginUser({email, password})`,
  `refreshSession(rawRefreshToken)`, `logout(rawRefreshToken)`. Returns plain
  data or throws `Error` with `.statusCode`.
- `auth.controller.js` — glues Express to the service: validates input, calls
  service, sets the refresh cookie, sends JSON, forwards errors to `next()`.
- `auth.middleware.js` — `verifyAccessToken(req, res, next)` reads
  `Authorization: Bearer <token>`, verifies JWT, attaches `req.user = {id, role}`.

## Endpoints

All under `/auth`, mounted in `app.js` alongside `healthRoutes`.

| Method | Path | Body | Behavior |
|---|---|---|---|
| POST | /auth/register | `{email, password}` | Validate → check email uniqueness (DB unique constraint is the source of truth; service catches `23505` and returns 409) → bcrypt hash (12 rounds) → insert user → issue token pair (same as login) |
| POST | /auth/login | `{email, password}` | Look up by email → bcrypt compare → 401 on any mismatch (no "user not found" vs "wrong password" distinction, avoids user enumeration) → issue token pair |
| POST | /auth/refresh | (reads `refresh_token` httpOnly cookie) | Hash incoming token, look up in `refresh_tokens` by hash, check not expired/not revoked → revoke old row → issue new access+refresh pair (rotation) |
| POST | /auth/logout | (reads `refresh_token` cookie) | Hash incoming token, revoke matching row, clear cookie |

Token details:

- Access token: JWT, `HS256`, secret = `process.env.JWT_SECRET`, 15m expiry,
  claims `{sub: user.id, role: user.role}`. Returned in JSON response body.
- Refresh token: random opaque value (not JWT) generated with `crypto.randomBytes(32)`,
  7d expiry. Raw value goes to the client only via `Set-Cookie`
  (`httpOnly; secure; sameSite=strict; path=/auth`). Only its SHA-256 hash is
  stored in `refresh_tokens.token_hash` — a DB leak doesn't leak usable tokens.
- Rate limiting: `express-rate-limit`, 10 requests / 15 min / IP, applied to all
  four `/auth/*` routes.

## Error Handling

Reuses the existing `errorHandler` middleware (`src/middleware/errorhandler.middleware.js`)
unchanged. Service layer throws `Error` objects with `.statusCode` set:

- 400 — validation failure (zod)
- 401 — bad credentials, missing/invalid/expired access token, invalid refresh token
- 403 — reused/revoked refresh token (possible token theft signal)
- 409 — email already registered

Logging: every controller logs via the existing `src/utils/logger.js` pino
singleton with a `[AUTH-CONTROLLER]` / `[AUTH-SERVICE]` tag, following the
`${TAG} message` pattern in `health.controller.js`. Passwords and token values
are never logged — only user id / email / event name on success, and
`err.message` on failure.

## Testing (for QA handoff)

- Register: success, duplicate email (409), invalid email format, weak password.
- Login: success, wrong password, nonexistent email (both return 401, same shape).
- Refresh: success (rotation happens, old token now rejected), expired token,
  revoked/reused token (403), missing cookie.
- Logout: success (subsequent refresh with same token fails), missing cookie.
- Rate limiting: 11th request in window is rejected (429).
- No response ever contains `password_hash` or raw token hashes.

## Out of Scope

- Password reset / forgot-password flow.
- Email verification.
- RBAC enforcement middleware beyond attaching `role` to the token (no
  role-gated routes exist yet to protect).
