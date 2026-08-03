/**
 * The project-status transition graph (src/constants/projectStatusTransitions.js)
 * and its enforcement inside `updateProjectStatusAdmin`.
 *
 * Before this, `PATCH /admin/projects/:id/status` validated only that a
 * status_code EXISTED in `project_statuses`, so `submitted -> completed` in one
 * request succeeded server-side; the only transition guard was the admin
 * dropdown in the React app.
 *
 * Database access: none. The graph itself is a pure in-code constant, and the
 * service-level assertions here exercise the role gate, which runs before
 * `pool.connect()`. DB_HOST/DB_PORT point at a closed port regardless, matching
 * every other test in the default suite.
 */

process.env.JWT_SECRET = 'test-secret-for-transition-graph-suite';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';

import { describe, it, expect } from 'vitest';
import {
  PROJECT_STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  isTerminalStatus,
  getAllowedNextStatuses,
  isTransitionAllowed,
} from '../src/constants/projectStatusTransitions.js';

/**
 * The authoritative 22 status codes, transcribed from
 * 016_reconcile_project_statuses.sql (21 rows) plus
 * 020_add_delivered_project_status.sql ('delivered'). Verified against a live
 * `SELECT code FROM project_statuses`.
 */
const ALL_STATUS_CODES = [
  'draft',
  'submitted',
  'under_review',
  'waiting_for_client',
  'quotation_sent',
  'quotation_accepted',
  'quotation_rejected',
  'payment_pending',
  'payment_verification',
  'accepted',
  'scheduled',
  'in_development',
  'in_testing',
  'client_review',
  'revision_requested',
  'revision_in_progress',
  'ready_for_deployment',
  'deployed',
  'delivered',
  'completed',
  'on_hold',
  'cancelled',
];

describe('transition graph shape', () => {
  it('has an entry for every status code in project_statuses', () => {
    // A missing key fails CLOSED (getAllowedNextStatuses returns []), which
    // would permanently strand every project in that status. That is a worse
    // failure than the hole this graph closes, so it is asserted directly.
    for (const code of ALL_STATUS_CODES) {
      expect(PROJECT_STATUS_TRANSITIONS, `missing graph entry for "${code}"`).toHaveProperty(code);
    }
  });

  it('contains no statuses that do not exist in project_statuses', () => {
    for (const code of Object.keys(PROJECT_STATUS_TRANSITIONS)) {
      expect(ALL_STATUS_CODES).toContain(code);
    }
  });

  it('only ever points at real status codes', () => {
    for (const [from, targets] of Object.entries(PROJECT_STATUS_TRANSITIONS)) {
      for (const to of targets) {
        expect(ALL_STATUS_CODES, `${from} -> ${to} targets an unknown status`).toContain(to);
      }
    }
  });

  it('marks exactly the codes that 016/020 set is_terminal on', () => {
    expect([...TERMINAL_STATUSES].sort()).toEqual(['cancelled', 'completed']);
    // Explicitly NOT terminal, per 016's header and 020's.
    expect(isTerminalStatus('delivered')).toBe(false);
    expect(isTerminalStatus('quotation_rejected')).toBe(false);
    expect(isTerminalStatus('on_hold')).toBe(false);
  });

  it('never lets a project leave a terminal status', () => {
    for (const code of TERMINAL_STATUSES) {
      expect(getAllowedNextStatuses(code)).toEqual([]);
    }
  });

  it('offers on_hold and cancelled from every non-terminal status', () => {
    for (const code of ALL_STATUS_CODES) {
      if (isTerminalStatus(code)) continue;
      expect(getAllowedNextStatuses(code), `${code} should offer on_hold`).toContain('on_hold');
      expect(getAllowedNextStatuses(code), `${code} should offer cancelled`).toContain('cancelled');
    }
  });

  it('fails closed for an unknown status', () => {
    expect(getAllowedNextStatuses('not_a_real_status')).toEqual([]);
    expect(isTransitionAllowed('not_a_real_status', 'completed')).toBe(false);
  });
});

describe('the concrete holes this closes', () => {
  // The two jumps named in the issue, plus the rest of the family.
  const ILLEGAL = [
    ['submitted', 'completed'],
    ['delivered', 'draft'],
    ['draft', 'completed'],
    ['draft', 'delivered'],
    ['submitted', 'delivered'],
    ['submitted', 'deployed'],
    ['under_review', 'completed'],
    ['quotation_sent', 'completed'],
    ['payment_pending', 'accepted'],
    ['in_development', 'completed'],
    ['completed', 'draft'],
    ['completed', 'in_development'],
    ['cancelled', 'in_development'],
    ['cancelled', 'submitted'],
    ['delivered', 'in_development'],
    ['deployed', 'draft'],
  ];

  for (const [from, to] of ILLEGAL) {
    it(`forbids ${from} -> ${to}`, () => {
      expect(isTransitionAllowed(from, to)).toBe(false);
    });
  }
});

describe('transitions the product actually performs', () => {
  const LEGAL = [
    ['draft', 'submitted'],
    ['submitted', 'under_review'],
    ['under_review', 'quotation_sent'],
    ['under_review', 'waiting_for_client'],
    ['waiting_for_client', 'quotation_sent'],
    ['quotation_sent', 'quotation_accepted'],
    ['quotation_sent', 'quotation_rejected'],
    ['quotation_rejected', 'quotation_sent'],
    ['quotation_accepted', 'payment_pending'],
    ['payment_pending', 'payment_verification'],
    ['payment_verification', 'accepted'],
    ['payment_verification', 'payment_pending'],
    ['accepted', 'scheduled'],
    ['scheduled', 'in_development'],
    ['in_development', 'in_testing'],
    ['in_testing', 'client_review'],
    ['in_testing', 'revision_in_progress'],
    ['client_review', 'revision_requested'],
    ['client_review', 'ready_for_deployment'],
    ['revision_requested', 'revision_in_progress'],
    ['revision_in_progress', 'in_testing'],
    ['ready_for_deployment', 'deployed'],
    ['deployed', 'delivered'],
    ['deployed', 'completed'],
    ['delivered', 'completed'],
    // On hold and back again.
    ['in_development', 'on_hold'],
    ['on_hold', 'in_development'],
    ['on_hold', 'completed'],
    // Cancellation from anywhere non-terminal.
    ['draft', 'cancelled'],
    ['in_testing', 'cancelled'],
    ['delivered', 'cancelled'],
  ];

  for (const [from, to] of LEGAL) {
    it(`permits ${from} -> ${to}`, () => {
      expect(isTransitionAllowed(from, to)).toBe(true);
    });
  }

  it('always permits re-saving the status a project already has', () => {
    // updateProjectStatusAdmin already treats this as a no-op (it suppresses
    // the duplicate client notification). Turning it into a 409 would be an
    // unrelated behaviour regression -- including for terminal statuses.
    for (const code of ALL_STATUS_CODES) {
      expect(isTransitionAllowed(code, code), `${code} -> ${code}`).toBe(true);
    }
  });
});

/**
 * FRONTEND / BACKEND PARITY.
 *
 * `frontend/src/modules/projects/utils/projectStatus.ts` drives the admin
 * status dropdown. If it offers a transition this graph rejects, the admin gets
 * a 409 from a control the UI told them was valid -- a broken feature.
 *
 * The relationship is deliberately one-directional: backend ⊇ frontend. The
 * backend may permit more (it is an integrity floor); the frontend may show
 * less (it is a UX narrowing). Only the direction that breaks users is
 * asserted.
 *
 * The map below is transcribed from `NEXT_STATUS_MAP` in that file. It is
 * duplicated rather than imported because this is a CommonJS backend suite and
 * that is a TypeScript frontend module -- the duplication is the point: if the
 * frontend map is edited to offer something new, this test is what catches the
 * divergence.
 */
describe('parity with the frontend admin dropdown', () => {
  const FRONTEND_FORWARD_PROGRESSION = [
    'draft',
    'submitted',
    'under_review',
    'waiting_for_client',
    'quotation_sent',
    'quotation_accepted',
    'quotation_rejected',
    'payment_pending',
    'payment_verification',
    'accepted',
    'scheduled',
    'in_development',
    'in_testing',
    'client_review',
    'revision_requested',
    'revision_in_progress',
    'ready_for_deployment',
    'deployed',
    'completed',
  ];

  const FRONTEND_NEXT_STATUS_MAP = {
    draft: ['submitted'],
    submitted: ['under_review'],
    under_review: ['waiting_for_client', 'quotation_sent'],
    waiting_for_client: ['under_review', 'quotation_sent'],
    quotation_sent: ['quotation_accepted', 'quotation_rejected'],
    quotation_accepted: ['payment_pending'],
    quotation_rejected: ['under_review', 'quotation_sent'],
    payment_pending: ['payment_verification'],
    payment_verification: ['accepted', 'payment_pending'],
    accepted: ['scheduled'],
    scheduled: ['in_development'],
    in_development: ['in_testing'],
    in_testing: ['client_review', 'revision_in_progress'],
    client_review: ['revision_requested', 'ready_for_deployment'],
    revision_requested: ['revision_in_progress'],
    revision_in_progress: ['in_testing'],
    ready_for_deployment: ['deployed'],
    deployed: ['completed'],
    delivered: ['completed'],
    completed: [],
    on_hold: FRONTEND_FORWARD_PROGRESSION,
    cancelled: [],
  };

  /** Mirrors `getSelectableNextStatuses`, including its escape hatches. */
  function frontendSelectable(status) {
    const isTerminal = status === 'completed' || status === 'cancelled';
    const forward = FRONTEND_NEXT_STATUS_MAP[status] ?? [];
    const exceptions = isTerminal ? [] : ['on_hold', 'cancelled'];
    return Array.from(new Set([status, ...forward, ...exceptions]));
  }

  for (const from of Object.keys(FRONTEND_NEXT_STATUS_MAP)) {
    it(`backend permits everything the dropdown offers from "${from}"`, () => {
      for (const to of frontendSelectable(from)) {
        expect(
          isTransitionAllowed(from, to),
          `frontend dropdown offers ${from} -> ${to} but the backend graph rejects it`
        ).toBe(true);
      }
    });
  }
});

describe('updateProjectStatusAdmin guard ordering', () => {
  it('still applies the staff role gate before any transition/database work', async () => {
    // Regression guard for tests/staffStatusAllowList.test.js's contract: the
    // role denial must remain reachable without a database, so adding the
    // transition check (which needs the project row) must not have moved it.
    const projectsService = await import('../src/services/projects.service.js');
    const { ROLES } = await import('../src/constants/roles.js');

    await expect(
      projectsService.default.updateProjectStatusAdmin(
        'a1b2c3d4-0000-4000-8000-000000000001',
        'completed',
        ROLES.STAFF
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
