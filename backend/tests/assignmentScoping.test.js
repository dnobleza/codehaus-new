/**
 * Assignment scoping and management, exercised the same way
 * adminAuthorization.test.js exercises the role split: the REAL middleware
 * chain, real signed JWTs, no vi.mock (route files are CommonJS and
 * `require()` resolves outside vitest's module graph, so vi.mock cannot
 * intercept a route file's own dependencies), and the database pointed at a
 * closed port before anything is imported so a request that gets PAST
 * authorization fails fast in the controller instead of ever reaching a live
 * database.
 *
 * The one thing adminAuthorization.test.js doesn't need that this suite
 * does: requireAssignedOrAdmin's "is this staff member on the team" check is
 * itself a DB read, which we deliberately never let a test reach for real.
 * Instead of mocking (which doesn't work here), this leans on a plain CJS
 * fact: `require()` caches modules by resolved path, so
 * projectAssignments.repository.js is the SAME object reference everywhere
 * it's required, including inside requireAssignedOrAdmin.middleware.js.
 * Overwriting `.isAssigned` on that shared object is genuine object
 * mutation, not module-graph interception, so it works identically under
 * plain Node and under vitest. The middleware calls
 * `projectAssignmentsRepo.isAssigned(...)` as a property access at call
 * time (never destructured at require time) specifically so this holds.
 */

process.env.JWT_SECRET = 'test-secret-for-assignment-suite';
// Closed port: pool.connect() is refused immediately rather than hanging.
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Plain Node `require()` (via createRequire), NOT `import()`. Vite-node's
// dynamic `import()` of a CJS file does not reliably hand back the exact
// same module object that a plain CommonJS `require()` elsewhere resolves
// to (they can land in different module registries), which would make the
// mutation trick below silently no-op. `require()` here goes through the
// real Node CJS resolver/cache -- the same one adminProjects.route.js's own
// `require('../repositories/projectAssignments.repository')` uses -- so both
// this test file and the middleware end up holding the identical object.
const require = createRequire(import.meta.url);

let app;
let projectAssignmentsRepo;
let originalIsAssigned;

beforeAll(() => {
  const adminProjectsRoute = require('../src/routes/adminProjects.route.js');
  projectAssignmentsRepo = require('../src/repositories/projectAssignments.repository.js');
  originalIsAssigned = projectAssignmentsRepo.isAssigned;

  app = express();
  app.use(express.json());
  app.use('/admin/projects', adminProjectsRoute);
  // Terminal error handler so a controller blowing up on the refused DB
  // connection produces a clean JSON error rather than Express's HTML page.
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
});

afterAll(() => {
  // Restore the real implementation so no other test file that happens to
  // share this worker's module cache inherits the stub.
  if (projectAssignmentsRepo) projectAssignmentsRepo.isAssigned = originalIsAssigned;
});

beforeEach(() => {
  // Default: nobody is assigned to anything, unless a test overrides this.
  projectAssignmentsRepo.isAssigned = async () => false;
});

function tokenFor(role, userId = '1') {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

function call(method, path, role, userId) {
  const req = request(app)[method](path);
  return role ? req.set('Authorization', `Bearer ${tokenFor(role, userId)}`) : req;
}

// A well-formed UUID that does not exist in any database.
const ID = 'a1b2c3d4-0000-4000-8000-000000000099';

describe('assignment management routes are admin-only', () => {
  const CASES = [
    // method,   path,                                       admin staff client
    ['post', `/admin/projects/${ID}/assignments`, 'A', 'D', 'D'],
    ['delete', `/admin/projects/${ID}/assignments/2`, 'A', 'D', 'D'],
  ];
  const ROLE_COLUMN = { ADMIN: 2, STAFF: 3, CLIENT: 4 };

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
});

describe('requireAssignedOrAdmin', () => {
  // GET /:id/assignments is reachable by both ADMIN and STAFF at the
  // requireRole layer, so it's the cleanest route to prove
  // requireAssignedOrAdmin's own behavior on top of that.
  const path = `/admin/projects/${ID}/assignments`;

  it('denies staff who are not assigned to the project (403)', async () => {
    projectAssignmentsRepo.isAssigned = async () => false;
    const res = await call('get', path, 'STAFF', '42');
    expect(res.status).toBe(403);
  });

  it('lets an assigned staff member through to the controller (not 401/403)', async () => {
    projectAssignmentsRepo.isAssigned = async () => true;
    const res = await call('get', path, 'STAFF', '42');
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('never blocks admin, even if the assignment check would deny', async () => {
    // Prove admin genuinely bypasses the lookup rather than happening to
    // pass it: make isAssigned always throw, and confirm admin still isn't
    // blocked by this middleware.
    projectAssignmentsRepo.isAssigned = async () => {
      throw new Error('isAssigned should never be called for admin');
    };
    const res = await call('get', path, 'ADMIN');
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('denies client before any assignment lookup runs (403, via requireRole upstream)', async () => {
    projectAssignmentsRepo.isAssigned = async () => {
      throw new Error('isAssigned should never be called for client');
    };
    const res = await call('get', path, 'CLIENT');
    expect(res.status).toBe(403);
  });

  it('applies the same gate to GET /:id', async () => {
    projectAssignmentsRepo.isAssigned = async () => false;
    const res = await call('get', `/admin/projects/${ID}`, 'STAFF', '42');
    expect(res.status).toBe(403);
  });

  it('applies the same gate to PATCH /:id/status', async () => {
    projectAssignmentsRepo.isAssigned = async () => false;
    const res = await call('patch', `/admin/projects/${ID}/status`, 'STAFF', '42');
    expect(res.status).toBe(403);
  });

  it('applies the same gate to PATCH /:id/milestones/:milestoneId', async () => {
    projectAssignmentsRepo.isAssigned = async () => false;
    const res = await call('patch', `/admin/projects/${ID}/milestones/${ID}`, 'STAFF', '42');
    expect(res.status).toBe(403);
  });

  it('applies the same gate to POST /:id/milestones/generate', async () => {
    projectAssignmentsRepo.isAssigned = async () => false;
    const res = await call('post', `/admin/projects/${ID}/milestones/generate`, 'STAFF', '42');
    expect(res.status).toBe(403);
  });

  it('lets assigned staff through PATCH /:id/status to the service layer (not 401/403)', async () => {
    projectAssignmentsRepo.isAssigned = async () => true;
    const res = await call('patch', `/admin/projects/${ID}/status`, 'STAFF', '42').send({
      statusCode: 'in_testing',
    });
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});

describe('GET /admin/projects list is not gated by requireAssignedOrAdmin', () => {
  it('does not consult the assignment lookup for the list route (scoping happens in the service layer)', async () => {
    projectAssignmentsRepo.isAssigned = async () => {
      throw new Error('isAssigned should never be called for the list route');
    };
    const res = await call('get', '/admin/projects', 'STAFF', '42');
    // Reaches the controller/service (and then the refused DB connection),
    // never the assignment-lookup path this middleware would use.
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
