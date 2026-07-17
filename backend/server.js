require('dotenv').config();

const app = require('./app');
const logger = require('./src/utils/logger.js');
const pool = require('./src/config/database');

const PORT = process.env.PORT || 3000;
const TAG = '[SERVER]';

async function startserver() {
  try {
    await pool.query('SELECT NOW()');
    logger.info('[DATABASE] Connection Successful');

    app.listen(PORT, () => {
      logger.info(`${TAG} Server is now running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`[DATABASE] ${error.message}`);
    process.exit(1);
  }
}

startserver();
