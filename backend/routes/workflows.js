// backend/routes/workflows.js
import express from "express";
import { createRequire } from "module";
import { Op } from "sequelize";

const router = express.Router();
const require = createRequire(import.meta.url);

// Load models bundle (prefer CJS, then fallback to ESM)
let models;
try {
  models = require("../models/index.cjs");
} catch {
  try {
    models = require("../models/index.js");
  } catch {
    models = await import("../models/index.js");
  }
}
const Workflow = models?.Workflow || models?.default?.Workflow;
if (!Workflow) {
  throw new Error('Workflow model not found. Ensure ../models/index.{cjs,js} exports { Workflow }.');
}

// Small helpers
const toInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Create workflow */
router.post("/", asyncHandler(async (req, res) => {
  const body = { ...(req.body || {}) };
  delete body._id; delete body.id;

  // normalize a few fields
  if (body.tags && !Array.isArray(body.tags)) body.tags = [String(body.tags)];
  if (body.isActive == null) body.isActive = true;

  try {
    const created = await Workflow.create({
      ...body,
      organizationId: req.orgId, // enforce org tenancy
    });
    res.status(201).json(created);
  } catch (e) {
    // unique on (organizationId, name)
    if (e?.name === "SequelizeUniqueConstraintError" || e?.original?.code === "23505") {
      return res.status(409).json({ error: "Workflow name must be unique within the organization." });
    }
    throw e;
  }
}));

/** Update workflow by id (org-scoped) */
router.put("/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id);
  const update = { ...(req.body || {}) };
  delete update._id; delete update.id; delete update.organizationId; // don't allow org switch via API

  const [count] = await Workflow.update(update, {
    where: { id, organizationId: req.orgId },
  });
  if (!count) return res.status(404).type("text/plain").send(`Workflow not found: ${id}`);

  const doc = await Workflow.findOne({ where: { id, organizationId: req.orgId } });
  res.json(doc);
}));

/** List workflows (org-scoped, optional filters) */
router.get("/", asyncHandler(async (req, res) => {
  const where = { organizationId: req.orgId };

  // optional filters
  if (typeof req.query.isActive !== "undefined") {
    where.isActive = String(req.query.isActive).toLowerCase() !== "false";
  }
  if (req.query.q) {
    // Simple name search; prefer ILIKE on Postgres, LIKE otherwise.
    const dialect = typeof Workflow?.sequelize?.getDialect === "function"
      ? Workflow.sequelize.getDialect()
      : undefined;
    const isPg = (dialect || "").toLowerCase() === "postgres";
    where.name = isPg
      ? { [Op.iLike]: `%${req.query.q}%` }
      : { [Op.like]: `%${req.query.q}%` };
  }

  const limit = toInt(req.query.limit, 100);
  const offset = toInt(req.query.offset, 0);

  const items = await Workflow.findAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit,
    offset,
  });
  res.json(items);
}));

export default router;
