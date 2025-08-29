// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });

/* ---------------- DB bootstrap ----------------
   Prefer Postgres/Sequelize when any PG-ish env var is set;
   otherwise fall back to Mongo/Mongoose.
-------------------------------------------------*/
const USE_PG = Boolean(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_HOST ||
  process.env.POSTGRES_USER ||
  process.env.POSTGRES_DB ||
  process.env.PGHOST ||
  process.env.PGUSER ||
  process.env.PGDATABASE
);

if (USE_PG) {
  try {
    const db = await import("./db/sequelize.cjs"); // CJS but works with import()
    const sequelize = db.sequelize || db.default?.sequelize;
    const initSequelize = db.initSequelize || db.default?.initSequelize;

    if (!sequelize && !initSequelize) {
      throw new Error("db/sequelize.cjs must export { sequelize } or { initSequelize }");
    }

    if (initSequelize) {
      await initSequelize(); // does authenticate (and optional sync) internally
    } else {
      await sequelize.authenticate();
      if (String(process.env.SEQUELIZE_SYNC).toLowerCase() === "true") {
        await sequelize.sync({ alter: false });
        console.log("✅ Sequelize synced");
      }
    }
    console.log("✅ Sequelize connected");
  } catch (err) {
    console.error("❌ Sequelize init error:", err);
    process.exit(1);
  }
} else {
  const { default: connectDB } = await import("./config/db.js");
  await connectDB();
  console.log("✅ Mongoose connected");
}

/* ---------------- Middleware ---------------- */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true,
  })
);

// Body parsers (bigger limits for base64/data URLs)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Attach organizationId for multi-tenant use in routes (JWT or headers)
try {
  const { default: orgContext } = await import("./middleware/orgContext.js");
  // First: try to derive org from Authorization: Bearer <JWT> (or x-org-id)
  app.use(orgContext);
} catch (e) {
  console.warn("[server] orgContext middleware unavailable, falling back to headers only");
}

// Fallback/normalize: if org not set by orgContext, derive from headers or default
app.use((req, _res, next) => {
  if (!req.orgId) {
    const hdr = (k) => (req.headers[k] || "").toString();
    req.orgId =
      hdr("x-org-id") ||
      hdr("x-organization-id") ||
      hdr("x-tenant-id") ||
      process.env.DEFAULT_ORG_ID ||
      "00000000-0000-0000-0000-000000000000";
  }
  next();
});

// Static for generated/served files
app.use("/tmp", express.static(path.join(process.cwd(), "tmp")));
app.use("/public", express.static(path.join(__dirname, "public")));

/* ---------------- Routes loader ---------------- */
async function loadRoute(p) {
  const m = await import(p);             // ESM-first; CJS will appear under default
  return m?.default ?? m?.router ?? m;   // normalize export shape
}

const BASE = process.env.API_BASE || "/layout-be/api";

// Load all routers (single place)
const layoutRoutes               = await loadRoute("./routes/layoutRoutes.js");
const excelRoutes                = await loadRoute("./routes/excelRoutes.js");
const qrRoutes                   = await loadRoute("./routes/qrRoutes.js");
const renderRoutes               = await loadRoute("./routes/renderRoutes.js");
const notifyRoutes               = await loadRoute("./routes/notifyRoutes.js");
const workflowsRoutes            = await loadRoute("./routes/workflows.js");
const workflowExecutionsRoutes   = await loadRoute("./routes/workflowExecutions.js");
const yogiRoutes                 = await loadRoute("./routes/yogiRoutes.js");

// Mount under the same base prefix (no duplicate mounts)
app.use("/api/notify", notifyRoutes);
app.use(`${BASE}/layouts`, layoutRoutes);
app.use(`${BASE}/excel`, excelRoutes);
app.use(`${BASE}/qr`, qrRoutes);
app.use(`${BASE}/render`, renderRoutes);
app.use(`${BASE}/notify`, notifyRoutes);
app.use(`${BASE}/workflows`, workflowsRoutes);
app.use(`${BASE}/workflow-executions`, workflowExecutionsRoutes);
app.use(`${BASE}/yogi`, yogiRoutes);

app.use("/api/workflow-executions", workflowExecutionsRoutes);

// (optional but helpful – do the same for the rest)
app.use("/api/layouts", layoutRoutes);
app.use("/api/excel",  excelRoutes);
app.use("/api/qr",     qrRoutes);
app.use("/api/render", renderRoutes);
app.use("/api/workflows", workflowsRoutes);
app.use("/api/yogi",   yogiRoutes);

// Health
app.get(`${BASE}/health`, (_req, res) =>
  res.json({ ok: true, db: USE_PG ? "postgres" : "mongo" })
);

// 404 (only for API base)
app.use((req, res, _next) => {
  if (req.path.startsWith(BASE)) {
    return res.status(404).json({ message: "Not found" });
  }
  res.status(404).type("text/plain").send("Not found");
});

/* ---------------- Error Handler ---------------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).type("text/plain").send(err.message || "Server error");
});

/* ---------------- Listen ---------------- */
const PORT = Number(process.env.PORT || 4001);
app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} (${USE_PG ? "Postgres/Sequelize" : "Mongo/Mongoose"})`
  );
});
