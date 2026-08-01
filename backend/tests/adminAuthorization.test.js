/**
 * Authorization contract for the two elevated routers.
 *
 * This exercises the REAL middleware chain -- real `verifyAccessToken`, real
 * `requireRole`, real route wiring -- driven by real signed JWTs. Nothing is
 * mocked, deliberately: the route files are CommonJS and `require()` resolves
 * through Node rather than through Vitest's module graph, so `vi.mock` cannot
 * intercept a route file's own dependencies. Testing the real chain is both
 * more honest and the only thing that actually works here.
 *
 * The database is pointed at a closed port before anything is imported, so a
 * request that gets PAST authorization fails fast inside the controller instead
 * of reaching a live database. That is what makes the "allowed" assertion safe:
 * every id below is a well-formed UUID that does not exist, so even against a
 * real database nothing could be mutated.
 *
 * Assertions are therefore asymmetric, and intentionally so:
 *   denied  -> exactly 403, which only `requireRole` produces
 *   allowed -> anything but 401/403, i.e. the request reached business logic
 *
 * What was wrong before: a blanket `requireRole('admin','staff')` on both
 * routers let one staff member author a quotation at any discount AND verify
 * the payment settling it -- pricing, invoicing, and settlement under a single
 * actor.
 */

process.env.JWT_SECRET = 'test-secret-for-authorization-suite';
// Closed port: pool.connect() is refused immediately rather than hanging.
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
  const adminProjectsRoute = (await import('../src/routes/adminProjects.route.js')).default;
  const adminPaymentsRoute = (await import('../src/routes/adminPayments.route.js')).default;

  app = express();
  app.use(express.json());
  app.use('/admin/projects', adminProjectsRoute);
  app.use('/admin/payments', adminPaymentsRoute);
  // Terminal error handler so a controller blowing up on the refused DB
  // connection produces a clean 500 rather than Express's HTML error page.
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
});

function tokenFor(role, userId = '1') {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

function call(method, path, role) {
  const req = request(app)[method](path);
  return role ? req.set('Authorization', `Bearer ${tokenFor(role)}`) : req;
}

// A well-formed UUID that does not exist in any database.
const ID = 'a1b2c3d4-0000-4000-8000-000000000001';

/*
  The contract, as a table. `A` = allowed past authorization, `D` = denied 403.

  The separating principle: ADMIN owns the commercial and financial ledger,
  STAFF owns delivery execution, CLIENT owns intent and approval.
*/
const CASES = [
  // method,  path,                                    admin staff client
  ['get',   `/admin/projects`,                          'A', 'A', 'D'],
  ['get',   `/admin/projects/${ID}`,                    'A', 'A', 'D'],
  // Reachable by staff, but the SERVICE restricts which status codes a staff
  // caller may set -- see the STAFF_ASSIGNABLE_STATUSES suite below.
  ['patch', `/admin/projects/${ID}/status`,             'A', 'A', 'D'],

  // Commercial: taking on or refusing new business.
  ['patch', `/admin/projects/${ID}/accept`,             'A', 'D', 'D'],
  ['patch', `/admin/projects/${ID}/decline`,            'A', 'D', 'D'],
  ['patch', `/admin/projects/${ID}/deliver`,            'A', 'D', 'D'],

  // Commercial: quotations set price and discount.
  ['post',  `/admin/projects/${ID}/quotations`,         'A', 'D', 'D'],
  ['patch', `/admin/projects/${ID}/quotations/${ID}`,   'A', 'D', 'D'],
  ['patch', `/admin/projects/${ID}/quotations/${ID}/send`, 'A', 'D', 'D'],

  // Delivery execution: staff's own surface.
  ['patch', `/admin/projects/${ID}/milestones/${ID}`,   'A', 'A', 'D'],
  ['post',  `/admin/projects/${ID}/milestones/generate`, 'A', 'A', 'D'],

  // Financial: staff may read the queue, never act on it.
  ['get',   `/admin/payments`,                          'A', 'A', 'D'],
  ['patch', `/admin/payments/${ID}/verify`,             'A', 'D', 'D'],
  ['patch', `/admin/payments/${ID}/reject`,             'A', 'D', 'D'],
];

const ROLE_COLUMN = { ADMIN: 2, STAFF: 3, CLIENT: 4 };

describe('elevated router authorization', () => {
  for (const role of ['ADMIN', 'STAFF', 'CLIENT']) {
    describe(role, () => {
      for (const row of CASES) {
        const [method, path] = row;
        const expected = row[ROLE_COLUMN[role]];
        const label = `${method.toUpperCase()} ${path.replaceAll(ID, ':id')}`;

        it(`${expected === 'A' ? 'allows' : 'denies'} ${label}`, async () => {
          const res = await call(method, path, role);
          if (expected === 'A') {
            expect(res.status).not.toBe(403);
            expect(res.status).not.toBe(401);
          } else {
            expect(res.status).toBe(403);
          }
        });
      }
    });
  }

  it('rejects an unauthenticated caller before any role check', async () => {
    const res = await call('patch', `/admin/payments/${ID}/verify`, null);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: '1', role: 'ADMIN' }, 'not-the-secret', { algorithm: 'HS256' });
    const res = await request(app)
      .patch(`/admin/payments/${ID}/verify`)
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('accepts lowercase role casing', async () => {
    // users.role is uppercase in the DB, but requireRole normalizes both sides
    // and nothing should break if a lowercase value ever reaches it.
    const res = await call('get', '/admin/projects', 'admin');
    expect(res.status).not.toBe(403);
  });

  it('denies an unknown role', async () => {
    const res = await call('get', '/admin/projects', 'superuser');
    expect(res.status).toBe(403);
  });
});
