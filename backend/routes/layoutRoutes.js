// backend/routes/layoutRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// ✅ Load the CommonJS models bundle only
const models = require("../models/index.cjs");
const Layout = models?.Layout || models?.default?.Layout;
if (!Layout) {
  throw new Error('Layout model not found in ../models/index.cjs. Make sure it exports { Layout }.');
}

const router = express.Router();

/* ---------- helpers ---------- */
const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function getPathInsensitive(obj, keyPath) {
  if (!obj || typeof keyPath !== "string") return undefined;
  const parts = keyPath
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((p) => String(p).trim())
    .filter(Boolean);

  let cur = obj;
  for (const raw of parts) {
    if (cur == null) return undefined;
    if (/^\d+$/.test(raw)) {
      const idx = Number(raw);
      if (!Array.isArray(cur) || idx < 0 || idx >= cur.length) return undefined;
      cur = cur[idx];
      continue;
    }
    const keys = Object.keys(cur);
    const found = keys.find((k) => k.trim().toLowerCase() === raw.toLowerCase());
    if (found === undefined) return undefined;
    cur = cur[found];
  }
  return cur;
}

function merge(template, data) {
  if (typeof template !== "string") return template;
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expr) => {
    const key = String(expr).trim();
    if (key === "__DEBUG__") {
      try {
        return Object.keys(data || {}).join(", ");
      } catch {
        return "";
      }
    }
    try {
      const val = getPathInsensitive(data, key);
      return val == null ? "" : String(val);
    } catch {
      return "";
    }
  });
}

function parseBorderColor(border) {
  if (!border || typeof border !== "string") return null;
  const m = border.match(/(#[0-9a-fA-F]{3,8}|\brgba?\([^)]+\)|[a-zA-Z]+)/);
  return m ? m[1] : null;
}

async function makePdfFromLayout({ layout, data, outPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const zones = layout?.structure?.zones || [];

    if (Array.isArray(zones) && zones.length > 0) {
      zones.forEach((z) => {
        const type = z.type || "text";
        const x = Number(z.x ?? 36);
        const y = Number(z.y ?? 36);
        const w = Number(z.width ?? 200);
        const h = Number(z.height ?? 20);

        if (type === "rect") {
          const fill = z.fill || z.styles?.backgroundColor || null;
          const stroke = z.stroke || parseBorderColor(z.styles?.border) || null;
          if (fill && fill !== "transparent") {
            doc.save().fillColor(fill).rect(x, y, w, h).fill().restore();
          }
          if (stroke) {
            doc.save().strokeColor(stroke).rect(x, y, w, h).stroke().restore();
          }
          return;
        }

        if (type === "image") {
          try {
            const src = merge(z.value ?? z.content ?? z.text ?? "", data);
            if (src && fs.existsSync(src)) {
              doc.image(src, x, y, { width: w, height: h });
            }
          } catch {}
          return;
        }

        const raw = z.content ?? z.value ?? z.text ?? "";
        const text = merge(String(raw), data);
        const fontSize = Number(z.fontSize) || Number(z.styles?.fontSize) || 12;
        const color =
          (typeof z.styles?.color === "string" && z.styles.color) || "#000000";
        const align = z.align || z.styles?.textAlign || "left";

        doc.fillColor(color).fontSize(fontSize).text(text, x, y, {
          width: w,
          height: h,
          align,
          ellipsis: true,
        });
      });
    } else {
      doc.fontSize(18).text(layout?.name || "Layout PDF", { underline: true });
      doc.moveDown();
      doc.fontSize(10).text("No zones in structure. Showing payload data:");
      doc.moveDown();
      doc.fontSize(10).text(JSON.stringify(data, null, 2), { width: 520 });
    }

    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

/* ---------- CRUD (Sequelize) ---------- */

// GET /layout-be/api/layouts
router.get("/", async (req, res) => {
  try {
    const layouts = await Layout.findAll({
      where: { organizationId: req.orgId },
      order: [["createdAt", "DESC"]],
    });
    res.json(layouts);
  } catch (err) {
    console.error("GET /layouts error:", err);
    res.status(500).json({ error: "Failed to fetch layouts" });
  }
});

// POST /layout-be/api/layouts
router.post("/", async (req, res) => {
  try {
    const { name, structure } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name required" });

    const saved = await Layout.create({
      name,
      structure: structure || { zones: [] },
      organizationId: req.orgId,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error("POST /layouts error:", err);
    res.status(500).json({ error: "Failed to save layout" });
  }
});

// GET /layout-be/api/layouts/:id
router.get("/:id", async (req, res) => {
  try {
    const row = await Layout.findOne({
      where: { id: req.params.id, organizationId: req.orgId },
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    console.error("GET /layouts/:id error:", err);
    res.status(500).json({ error: "Failed to fetch layout" });
  }
});

/* ---------- PDF RENDERING ---------- */

// POST /layout-be/api/layouts/:id/render/pdf
router.post("/:id/render/pdf", async (req, res) => {
  try {
    const row = await Layout.findOne({
      where: { id: req.params.id, organizationId: req.orgId },
    });
    if (!row) return res.status(404).json({ error: "Layout not found" });

    const layout = row.toJSON();
    const { data = {}, filename } = req.body || {};
    const fname = filename || `layout-${row.id}-${Date.now()}.pdf`;
    const outPath = path.join(TMP_DIR, fname);

    await makePdfFromLayout({ layout, data, outPath });
    res.json({ file: `/tmp/${path.basename(outPath)}` });
  } catch (err) {
    console.error("POST /layouts/:id/render/pdf error:", err);
    res.status(500).json({ error: "Failed to render PDF" });
  }
});

// POST /layout-be/api/layouts/:id/render/pdf-batch
router.post("/:id/render/pdf-batch", async (req, res) => {
  try {
    const row = await Layout.findOne({
      where: { id: req.params.id, organizationId: req.orgId },
    });
    if (!row) return res.status(404).json({ error: "Layout not found" });

    const layout = row.toJSON();
    const { rows = [], filenamePrefix } = req.body || {};

    const stamp = Date.now();
    const prefix = filenamePrefix || `layout-${row.id}`;
    const batchFolderName = `${prefix}-${stamp}`;
    const batchFolder = path.join(TMP_DIR, batchFolderName);
    fs.mkdirSync(batchFolder, { recursive: true });

    const files = [];
    for (let i = 0; i < rows.length; i++) {
      const fname = `${prefix}-${i + 1}.pdf`;
      const outPath = path.join(batchFolder, fname);
      await makePdfFromLayout({ layout, data: rows[i], outPath });
      files.push({ index: i, file: `/tmp/${batchFolderName}/${fname}` });
    }

    const zipName = `${prefix}-${stamp}.zip`;
    const zipPath = path.join(TMP_DIR, zipName);
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const zip = archiver("zip", { zlib: { level: 9 } });
      output.on("close", resolve);
      zip.on("error", reject);
      zip.pipe(output);
      zip.directory(batchFolder, false);
      zip.finalize();
    });

    res.json({ files, zip: `/tmp/${path.basename(zipPath)}` });
  } catch (err) {
    console.error("POST /layouts/:id/render/pdf-batch error:", err);
    res.status(500).json({ error: "Failed to render PDF batch" });
  }
});

export default router;
