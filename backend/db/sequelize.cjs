// backend/db/sequelize.cjs
const { Sequelize } = require('sequelize');
try { require('dotenv').config(); } catch {}
const sequelize = new Sequelize(
  process.env.POSTGRES_DB, process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: { freezeTableName: true, timestamps: true },
  }
);

async function initSequelize() {
  await sequelize.authenticate();
  if (String(process.env.SEQUELIZE_SYNC).toLowerCase() === 'true') {
    await sequelize.sync();
  }
  return sequelize;
}

module.exports = { sequelize, initSequelize };
