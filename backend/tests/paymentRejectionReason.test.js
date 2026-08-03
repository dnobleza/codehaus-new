/**
 * Contract test: rejecting a payment REQUIRES a reason.
 *
 * Same technique as adminAuthorization.test.js -- the real route + real
 * middleware chain driven by a real signed JWT, with the database pointed at a
 * closed port so nothing touches a live DB. A request that passes validation
 * fails later, inside the controller, on the refused connection; a request that
 * fails validation is rejected by Zod BEFORE any database work is attempted.
 * That difference is exactly what these assertions read:
 *
 *   missing/blank reason -> 400, produced only by adminRejectPaymentSchema
 *   valid reason         -> anything but 400, i.e. validation passed
 *
 * This mirrors the guarantee projects.validator.js's adminDeclineSchema gives
 * the project-decline flow, which this feature was built to match.
 */

process.env.JWT_SECRET = 'test-secret-for-payment-rejection-suite';
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
let adminRejectPaymentSchema;

beforeAll(async () => {
  const adminPaymentsRoute = (await import('../src/routes/adminPayments.route.js')).default;
  ({ adminRejectPaymentSchema } = await import('../src/validators/payments.validator.js'));

  app = express();
  app.use(express.json());
  app.use('/admin/payments', adminPaymentsRoute);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
});

const ID = 'a1b2c3d4-0000-4000-8000-000000000001';

function reject(body, role = 'admin') {
  return request(app)
    .patch(`/admin/payments/${ID}/reject`)
    .set('Authorization', `Bearer ${jwt.sign({ sub: '1', role }, process.env.JWT_SECRET, { algorithm: 'HS256' })}`)
    .send(body);
}

describe('PATCH /admin/payments/:id/reject requires a reason', () => {
  it('rejects an empty body with 400', async () => {
    const res = await reject({});
    expect(res.status).toBe(400);
  });

  it('rejects a blank/whitespace-only reason with 400', async () => {
    expect((await reject({ reason: '' })).status).toBe(400);
    expect((await reject({ reason: '    ' })).status).toBe(400);
  });

  it('rejects a reason beyond the 5000-character limit with 400', async () => {
    const res = await reject({ reason: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
  });

  it('lets a valid reason through validation', async () => {
    // Reaches the service and dies on the closed DB port -- the point is only
    // that it was NOT turned away by the validator.
    const res = await reject({ reason: 'The uploaded screenshot is unreadable. Please resend a clearer image.' });
    expect(res.status).not.toBe(400);
  });
});

describe('adminRejectPaymentSchema', () => {
  it('trims and sanitizes the reason, matching adminDeclineSchema', () => {
    const parsed = adminRejectPaymentSchema.parse({ reason: '  Wrong reference number  ' });
    expect(parsed.reason).toBe('Wrong reference number');
  });

  it('strips XSS payloads rather than storing them verbatim', () => {
    const parsed = adminRejectPaymentSchema.parse({ reason: '<script>alert(1)</script>Blurry proof' });
    expect(parsed.reason).not.toContain('<script>');
    expect(parsed.reason).toContain('Blurry proof');
  });
});
