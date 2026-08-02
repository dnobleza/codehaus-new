/**
 * `GET /admin/users/assignable` backs the project assignment picker. It
 * returns names and email addresses for every active staff and admin user, so
 * it is admin-only — staff reads its own project's roster through the
 * assignment-gated `GET /admin/projects/:id/assignments` instead.
 *
 * Same approach as adminAuthorization.test.js: the real middleware chain with
 * real signed JWTs, no mocking (the route files are CommonJS, so `require()`
 * resolves outside Vitest's module graph and `vi.mock` cannot intercept it).
 * The database points at a closed port, so anything past authorization fails
 * fast instead of reaching a live database.
 */

process.env.JWT_SECRET = 'test-secret-for-authorization-suite';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';

import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

let app;

beforeAll(async () => {
  const adminUsersRoute = (await import('../src/routes/adminUsers.route.js')).default;
  app = express();
  app.use(express.json());
  app.use('/admin/users', adminUsersRoute);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
});

function call(role) {
  const req = request(app).get('/admin/users/assignable');
  if (!role) return req;
  const token = jwt.sign({ sub: '1', role }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  return req.set('Authorization', `Bearer ${token}`);
}

describe('GET /admin/users/assignable', () => {
  it('allows ADMIN past authorization', async () => {
    const res = await call('ADMIN');
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('denies STAFF — this is a user directory, not a project roster', async () => {
    const res = await call('STAFF');
    expect(res.status).toBe(403);
  });

  it('denies CLIENT', async () => {
    const res = await call('CLIENT');
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated caller', async () => {
    const res = await call(null);
    expect(res.status).toBe(401);
  });
});

describe('assignable-role policy', () => {
  it('permits staff and admin, and excludes client', async () => {
    const { ASSIGNABLE_ROLES } = await import('../src/services/users.service.js');
    expect(ASSIGNABLE_ROLES).toContain('STAFF');
    expect(ASSIGNABLE_ROLES).toContain('ADMIN');
    // A client reaches their own project through `client_id` ownership, never
    // through project_assignments, so assigning one is meaningless.
    expect(ASSIGNABLE_ROLES).not.toContain('CLIENT');
  });
});
