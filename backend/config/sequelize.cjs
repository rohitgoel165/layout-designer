// backend/config/sequelize.cjs (CommonJS)
try {
  // Load .env only if it exists (local dev); containers get env from compose
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
} catch (_) {
  // no-op if dotenv isn't installed
}

const common = {
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'layoutdb',
  username: process.env.POSTGRES_USER || 'layout',
  password: process.env.POSTGRES_PASSWORD || 'layoutpass',
  logging: false,
  define: { freezeTableName: true, timestamps: true },
};

module.exports = {
  development: common,
  test: common,
  production: common,
};
