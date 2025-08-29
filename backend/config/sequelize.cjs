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
  logging: false,
  define: { freezeTableName: true, timestamps: true },
};

// Prefer single DATABASE_URL when present (avoids drift across envs)
const usingUrl = !!process.env.DATABASE_URL;
// NOTE: sequelize-cli expects snake_case key: use_env_variable
const fromUrl = usingUrl ? { ...common, use_env_variable: 'DATABASE_URL' } : null;
const fromParts = usingUrl
  ? null
  : {
      ...common,
      host: process.env.POSTGRES_HOST || 'postgres',
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DB || 'layoutdb',
      username: process.env.POSTGRES_USER || 'layout',
      password: process.env.POSTGRES_PASSWORD || 'layoutpass',
    };

module.exports = {
  development: usingUrl ? fromUrl : fromParts,
  test: usingUrl ? fromUrl : fromParts,
  production: usingUrl ? fromUrl : fromParts,
};
