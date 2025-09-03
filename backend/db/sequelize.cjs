// backend/db/sequelize.cjs
const { Sequelize } = require('sequelize');
try { require('dotenv').config(); } catch {}

const common = {
  dialect: 'postgres',
  logging: false,
  define: { freezeTableName: true, timestamps: true },
};

let sequelize;
if (process.env.DATABASE_URL) {
  // Prefer a single URL to avoid env drift
  sequelize = new Sequelize(process.env.DATABASE_URL, common);
} else {
  sequelize = new Sequelize(
    process.env.POSTGRES_DB,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    {
      ...common,
      host: process.env.POSTGRES_HOST || 'postgres',
      port: process.env.POSTGRES_PORT || 5432,
    }
  );
}

async function initSequelize() {
  await sequelize.authenticate();
  if (String(process.env.SEQUELIZE_SYNC).toLowerCase() === 'true') {
    await sequelize.sync();
  }
  return sequelize;
}

module.exports = { sequelize, initSequelize };
