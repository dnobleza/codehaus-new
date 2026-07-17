const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./src/utils/logger');
const TAG = '[APP]';

const healthRoutes = require('./src/routes/health.route');
const authRoutes = require('./src/routes/auth.route');
const errorHandler = require('./src/middleware/errorhandler.middleware');

const app = express();

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

app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use(errorHandler);

module.exports = app;
