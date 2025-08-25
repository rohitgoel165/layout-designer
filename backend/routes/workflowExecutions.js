// backend/routes/workflowExecutions.js
import express from "express";
import { createRequire } from "module";

const router = express.Router();
const require = createRequire(import.meta.url);

// Load models bundle (CJS first, then fallback)
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
const WorkflowExecution = models?.WorkflowExecution || models?.default?.WorkflowExecution;
if (!WorkflowExecution) {
  throw new Error('WorkflowExecution model not found. Ensure ../models/index.{cjs,js} exports { WorkflowExecution }.');
}

// Create an execution (Job)
router.post("/", async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // normalize fields
    const startTime = payload.startTime ? new Date(payload.startTime) : new Date();
    const status = payload.status || "pending";
    const workflowId =
      payload.workflowId != null
        ? Number(payload.workflowId)
        : null;

    const created = await WorkflowExecution.create({
      ...payload,
      workflowId,
      startTime,
      status,
      organizationId: req.orgId, // enforce org scoping on write
    });

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// List executions (optionally by workflowId)
router.get("/", async (req, res, next) => {
  try {
    const where = { organizationId: req.orgId };
    if (req.query.workflowId) {
      where.workflowId = Number(req.query.workflowId);
    }

    const items = await WorkflowExecution.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Delete an execution (org-scoped)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await WorkflowExecution.destroy({
      where: { id, organizationId: req.orgId },
    });
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, deleted });
  } catch (e) {
    next(e);
  }
});

export default router;
