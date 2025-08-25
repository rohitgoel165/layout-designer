// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Works with CJS (.cjs) or ESM exports
    const db = await import("./db/sequelize.cjs");
    const sequelize = db.sequelize || db.default?.sequelize;
    const initSequelize = db.initSequelize || db.default?.initSequelize;

    if (!sequelize && !initSequelize) {
      throw new Error("db/sequelize.cjs must export { sequelize } or { initSequelize }");
    }

    if (initSequelize) {
      await initSequelize(); // authenticate (and optional sync) internally
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

// Attach organizationId for multi-tenant use in routes
app.use((req, _res, next) => {
  const hdr = (k) => (req.headers[k] || "").toString();
  req.orgId =
    hdr("x-org-id") ||
    hdr("x-organization-id") ||
    hdr("x-tenant-id") ||
    process.env.DEFAULT_ORG_ID ||
    "00000000-0000-0000-0000-000000000000";
  next();
});

// Static for generated/served files
app.use("/tmp", express.static(path.join(process.cwd(), "tmp")));
app.use("/public", express.static(path.join(__dirname, "public")));

/* ---------------- Routes (universal loader) ---------------- */
const { createRequire } = await import("module");
const requireCJS = createRequire(import.meta.url);

/* ---------------- Routes (pure-ESM loader) ---------------- */
async function loadRoute(p) {
  const m = await import(p);             // no require() fallback
  return m?.default ?? m?.router ?? m;   // CJS becomes default
}

const layoutRoutes = await loadRoute("./routes/layoutRoutes.js");
const excelRoutes = await loadRoute("./routes/excelRoutes.js");
const qrRoutes = await loadRoute("./routes/qrRoutes.js");
const renderRoutes = await loadRoute("./routes/renderRoutes.js");
const notifyRoutes = await loadRoute("./routes/notifyRoutes.js");
const workflowsRoutes = await loadRoute("./routes/workflows.js");
const workflowExecutionsRoutes = await loadRoute("./routes/workflowExecutions.js");
const yogiRoutes = await loadRoute("./routes/yogiRoutes.js");

app.use("/layout-be/api/layouts", layoutRoutes);
app.use("/layout-be/api/excel", excelRoutes);
app.use("/layout-be/api/qr", qrRoutes);
app.use("/layout-be/api/render", renderRoutes);
app.use("/layout-be/api/notify", notifyRoutes);
app.use("/layout-be/api/workflows", workflowsRoutes);
app.use("/layout-be/api/workflow-executions", workflowExecutionsRoutes);
app.use("/layout-be/api/yogi", yogiRoutes);


// Health
app.get("/layout-be/api/health", (_req, res) =>
  res.json({ ok: true, db: USE_PG ? "postgres" : "mongo" })
);

// 404
app.use((req, res, _next) => {
  if (req.path.startsWith("/layout-be/api/")) {
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
  console.log(`Server running on port ${PORT} (${USE_PG ? "Postgres/Sequelize" : "Mongo/Mongoose"})`);
});
