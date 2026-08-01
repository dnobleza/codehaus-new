/**
 * `PATCH /admin/projects/:id/status` is the one endpoint where delivery
 * progress and commercial outcomes share a route, so route-level gating cannot
 * express the rule. Staff legitimately needs the endpoint to report build
 * progress, but must not be able to declare a project `completed`, `cancelled`,
 * or `accepted` -- those are commercial outcomes.
 *
 * The role check in `updateProjectStatusAdmin` runs BEFORE `pool.connect()`, so
 * every denial asserted here is reached without any database access. The DB is
 * pointed at a closed port regardless.
 */

process.env.JWT_SECRET = 'test-secret-for-authorization-suite';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';

import { describe, it, expect, beforeAll } from 'vitest';

let projectsService;
let ROLES;
let STAFF_ASSIGNABLE_STATUSES;

const ID = 'a1b2c3d4-0000-4000-8000-000000000001';

beforeAll(async () => {
  projectsService = (await import('../src/services/projects.service.js')).default
    ?? (await import('../src/services/projects.service.js'));
  const constants = await import('../src/constants/roles.js');
  ROLES = constants.ROLES ?? constants.default.ROLES;
  STAFF_ASSIGNABLE_STATUSES =
    constants.STAFF_ASSIGNABLE_STATUSES ?? constants.default.STAFF_ASSIGNABLE_STATUSES;
});

// Commercial and terminal codes that exist in project_statuses but must never
// be settable by staff. Verified against 016_reconcile_project_statuses.sql.
const COMMERCIAL_STATUSES = [
  'accepted',
  'completed',
  'cancelled',
  'on_hold',
  'draft',
  'submitted',
  'under_review',
  'pending_review',
  'quotation_sent',
  'quotation_accepted',
  'quotation_rejected',
  'payment_pending',
  'payment_verification',
];

describe('staff project-status allow-list', () => {
  it('exposes a non-empty allow-list of delivery-only statuses', () => {
    expect(STAFF_ASSIGNABLE_STATUSES.length).toBeGreaterThan(0);
  });

  it('never allows a commercial or terminal status', () => {
    for (const code of COMMERCIAL_STATUSES) {
      expect(STAFF_ASSIGNABLE_STATUSES).not.toContain(code);
    }
  });

  for (const code of COMMERCIAL_STATUSES) {
    it(`denies STAFF setting "${code}" with 403`, async () => {
      await expect(
        projectsService.updateProjectStatusAdmin(ID, code, ROLES.STAFF),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  }

  it('denies staff regardless of the casing of the role it receives', async () => {
    await expect(
      projectsService.updateProjectStatusAdmin(ID, 'completed', 'staff'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lets a delivery status past the role gate for STAFF', async () => {
    // Past the gate it hits the (refused) database, so anything except a 403 is
    // proof the allow-list admitted it.
    await expect(
      projectsService.updateProjectStatusAdmin(ID, 'in_development', ROLES.STAFF),
    ).rejects.not.toMatchObject({ statusCode: 403 });
  });

  it('does not restrict ADMIN', async () => {
    await expect(
      projectsService.updateProjectStatusAdmin(ID, 'completed', ROLES.ADMIN),
    ).rejects.not.toMatchObject({ statusCode: 403 });
  });

  it('does not restrict internal callers that pass no role', async () => {
    await expect(
      projectsService.updateProjectStatusAdmin(ID, 'completed'),
    ).rejects.not.toMatchObject({ statusCode: 403 });
  });
});
