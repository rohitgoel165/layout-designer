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
const WorkflowExecution =
  models?.WorkflowExecution || models?.default?.WorkflowExecution;
if (!WorkflowExecution) {
  throw new Error(
    "WorkflowExecution model not found. Ensure ../models/index.{cjs,js} exports { WorkflowExecution }."
  );
}

/* ------------------------------- utilities ------------------------------- */

const toInt = (v, d = undefined) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? d : Number(v);

const applyOrgScope = (where, req) => {
  const w = { ...where };
  if (req.orgId) w.organizationId = req.orgId;
  return w;
};

const normalizeCreatePayload = (body = {}) => {
  const payload = { ...body };

  // status, times, progress
  const status = String(payload.status || "pending");
  const startTime = payload.startTime ? new Date(payload.startTime) : new Date();
  let completedAt = payload.completedAt
    ? new Date(payload.completedAt)
    : undefined;
  let endTime = payload.endTime ? new Date(payload.endTime) : undefined;
  let progress =
    typeof payload.progress === "number" ? payload.progress : undefined;

  if (status.toLowerCase() === "completed") {
    completedAt = completedAt || new Date();
    endTime = endTime || completedAt;
    progress = typeof progress === "number" ? progress : 100;
  }

  // unify request/response mirrors for dashboard
  const results = Array.isArray(payload.results) ? payload.results : [];
  const requestData =
    payload.requestData != null ? payload.requestData : payload.inputData;
  const responseData =
    payload.responseData != null
      ? payload.responseData
      : results.length
      ? { outputs: results }
      : null;

  // light hints for table columns
  const firstOut = results[0] || {};
  const format =
    payload.format || firstOut.outputType || (results.length ? "result" : null);
  const layoutName =
    payload.layoutName ||
    (payload.inputData && payload.inputData.template && payload.inputData.template.name) ||
    payload.workflowName ||
    null;

  return {
    ...payload,
    status,
    startTime,
    endTime,
    completedAt,
    progress,
    requestData,
    responseData,
    results,
    format,
    layoutName,
    // coerce numbers where appropriate
    workflowId:
      payload.workflowId != null ? Number(payload.workflowId) : null,
  };
};

/* --------------------------------- routes -------------------------------- */

// Create an execution (Job)
router.post("/", async (req, res, next) => {
  try {
    const normalized = normalizeCreatePayload(req.body || {});
    const toCreate = {
      ...normalized,
      // apply org scoping only if middleware provided it
      organizationId: req.orgId || normalized.organizationId || null,
    };

    const created = await WorkflowExecution.create(toCreate);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// List executions (supports org, workflowId, status, q, limit/offset)
router.get("/", async (req, res, next) => {
  try {
    const where = applyOrgScope({}, req);

    const wfId = toInt(req.query.workflowId);
    if (wfId != null) where.workflowId = wfId;

    const status = req.query.status?.toString().trim();
    if (status) where.status = status;

    const limit = toInt(req.query.limit, 200);
    const offset = toInt(req.query.offset || req.query.skip, 0);

    // simple text search
    const q = req.query.q?.toString().trim();
    const opts = {
      where,
      order: [["createdAt", "DESC"]],
      ...(limit != null ? { limit } : {}),
      ...(offset != null ? { offset } : {}),
    };

    // For portability across dialects, filter in-memory when q is present.
    const items = await WorkflowExecution.findAll(opts);
    const filtered =
      q && q.length
        ? items.filter((x) => {
            const rx = new RegExp(q, "i");
            return (
              rx.test(x.workflowName || "") ||
              rx.test(String(x.workflowId || "")) ||
              rx.test(String(x.jobId || "")) ||
              rx.test(String(x.status || "")) ||
              rx.test(String(x.format || "")) ||
              (Array.isArray(x.results) &&
                x.results.some((r) => rx.test(r.outputType || "")))
            );
          })
        : items;

    res.json(filtered);
  } catch (e) {
    next(e);
  }
});

// Read single execution
router.get("/:id", async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    if (id == null) return res.status(400).json({ error: "Invalid id" });

    const where = applyOrgScope({ id }, req);
    const item = await WorkflowExecution.findOne({ where });
    if (!item) return res.status(404).json({ error: "Not found" });

    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Delete an execution
router.delete("/:id", async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    if (id == null) return res.status(400).json({ error: "Invalid id" });

    const deleted = await WorkflowExecution.destroy({
      where: applyOrgScope({ id }, req),
    });
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    res.json({ ok: true, deleted });
  } catch (e) {
    next(e);
  }
});

export default router;
