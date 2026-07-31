const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./src/utils/logger');
const TAG = '[APP]';

const healthRoutes = require('./src/routes/health.route');
const authRoutes = require('./src/routes/auth.route');
const packagesRoutes = require('./src/routes/packages.route');
const addonsRoutes = require('./src/routes/addons.route');
const projectsRoutes = require('./src/routes/projects.route');
const quotationsRoutes = require('./src/routes/quotations.route');
const paymentsRoutes = require('./src/routes/payments.route');
const adminPackagesRoutes = require('./src/routes/adminPackages.route');
const adminAddonsRoutes = require('./src/routes/adminAddons.route');
const adminProjectsRoutes = require('./src/routes/adminProjects.route');
const adminPaymentsRoutes = require('./src/routes/adminPayments.route');
const errorHandler = require('./src/middleware/errorhandler.middleware');

const app = express();

// Trust the first hop in front of this app (reverse proxy/load balancer) so
// req.ip reflects the real client address instead of the proxy's address.
// Without this, express-rate-limit keys every client behind the proxy into
// a single shared bucket (see rateLimiter.middleware.js). No deployment docs
// in this repo specify a proxy chain depth, so default to a single hop; bump
// this if the app is ever deployed behind more than one reverse-proxy layer.
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Only thumbnails/banners are served through this public, unauthenticated
// static mount -- they are marketing assets meant to be publicly visible in
// the client portal/package catalog. payment-proofs is DELIBERATELY EXCLUDED:
// proof-of-payment files can contain financial PII (bank account numbers,
// GCash/Maya transaction screenshots), so they are only reachable through
// the authenticated GET /projects/:id/payments/:paymentId/proof route (see
// projects.route.js / payments.controller.js / payments.service.js), which
// re-checks project ownership (or ADMIN/STAFF) before streaming the file.
app.use('/uploads/thumbnails', express.static(path.join(__dirname, 'uploads', 'thumbnails')));
app.use('/uploads/banners', express.static(path.join(__dirname, 'uploads', 'banners')));

app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/packages', packagesRoutes);
app.use('/addons', addonsRoutes);
app.use('/projects', projectsRoutes);
app.use('/quotations', quotationsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin/packages', adminPackagesRoutes);
app.use('/admin/addons', adminAddonsRoutes);
app.use('/admin/projects', adminProjectsRoutes);
app.use('/admin/payments', adminPaymentsRoutes);
app.use(errorHandler);

module.exports = app;
