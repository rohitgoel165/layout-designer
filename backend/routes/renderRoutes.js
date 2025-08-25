// routes/renderRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import PDFDocument from "pdfkit";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
const Layout = models?.Layout || models?.default?.Layout;
if (!Layout) {
  throw new Error('Layout model not found. Ensure ../models/index.{cjs,js} exports { Layout }.');
}

const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// tiny templating: {{field}} or {{nested.path}}
function interpolate(text = "", data = {}) {
  return String(text).replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const val = key.split(".").reduce((o, k) => (o ? o[k] : undefined), data);
    return (val ?? "").toString();
  });
}

/**
 * Minimal renderer that understands zones from saved layout:
 *  - 'text' -> draw text
 *  - 'rect' -> draw rectangle
 * Extend with images/barcodes as needed.
 */
function renderPdfFromLayout({ layout, data, outPath }) {
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const zones = layout?.structure?.zones || [];
  zones.forEach((z) => {
    const type = z?.type || "text";
    const x = Number(z?.x ?? 50);
    const y = Number(z?.y ?? 50);
    const w = Number(z?.width ?? 200);
    const h = Number(z?.height ?? 24);
    const fontSize = Number(z?.fontSize ?? z?.styles?.fontSize ?? 12);
    const raw = z?.content ?? z?.sampleText ?? z?.name ?? "";

    if (type === "rect") {
      const stroke = z?.strokeColor || z?.styles?.border || "#333";
      doc.save().strokeColor(stroke).lineWidth(1).rect(x, y, w, h).stroke().restore();
      return;
    }

    // default: text
    const txt = interpolate(raw, data);
    doc.fontSize(fontSize).text(txt, x, y, { width: w, height: h });
  });

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

// POST /layout-be/api/render/pdf -> single PDF
router.post("/pdf", async (req, res) => {
  try {
    const { layoutId, data = {}, filename } = req.body || {};
    if (!layoutId) return res.status(400).json({ error: "layoutId required" });

    // org-scoped fetch (Sequelize)
    const row = await Layout.findOne({
      where: { id: layoutId, organizationId: req.orgId },
    });
    if (!row) return res.status(404).json({ error: "Layout not found" });

    const layout = row.toJSON ? row.toJSON() : row;
    const outName = filename || `layout-${row.id}-${Date.now()}.pdf`;
    const outPath = path.join(TMP_DIR, outName);

    await renderPdfFromLayout({ layout, data, outPath });

    // served via app.use('/tmp', express.static(...))
    return res.json({ file: `/tmp/${outName}`, filename: outName });
  } catch (err) {
    console.error("render /pdf failed:", err);
    res.status(500).json({ error: err?.message || "Render failed" });
  }
});

// POST /layout-be/api/render/batch -> many PDFs + zip
router.post("/batch", async (req, res) => {
  try {
    const { layoutId, rows = [], filenamePrefix = "doc" } = req.body || {};
    if (!layoutId) return res.status(400).json({ error: "layoutId required" });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows array required" });
    }

    // org-scoped fetch (Sequelize)
    const row = await Layout.findOne({
      where: { id: layoutId, organizationId: req.orgId },
    });
    if (!row) return res.status(404).json({ error: "Layout not found" });

    const layout = row.toJSON ? row.toJSON() : row;

    // render PDFs to /tmp
    const files = [];
    for (let i = 0; i < rows.length; i++) {
      const name = `${filenamePrefix}-${String(i + 1).padStart(3, "0")}.pdf`;
      const outPath = path.join(TMP_DIR, name);
      await renderPdfFromLayout({ layout, data: rows[i], outPath });
      files.push({ rowIndex: i, filename: name, file: `/tmp/${name}` });
    }

    // zip them
    const zipName = `bundle-${row.id}-${Date.now()}.zip`;
    const zipPath = path.join(TMP_DIR, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    const zipDone = new Promise((resolve, reject) => {
      output.on("close", resolve);
      output.on("error", reject);
    });

    archive.pipe(output);
    for (const f of files) {
      archive.file(path.join(TMP_DIR, f.filename), { name: f.filename });
    }
    await archive.finalize();
    await zipDone;

    return res.json({ files, zip: `/tmp/${zipName}` });
  } catch (err) {
    console.error("render /batch failed:", err);
    res.status(500).json({ error: err?.message || "Render batch failed" });
  }
});

export default router;
