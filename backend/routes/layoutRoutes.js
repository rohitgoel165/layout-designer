// backend/routes/layoutRoutes.js (recreated)
import express from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Load CJS models bundle
const models = require("../models/index.cjs");
const Layout = models?.Layout || models?.default?.Layout;
if (!Layout) throw new Error("Layout model missing");

const router = express.Router();

const TMP_DIR = path.join(process.cwd(), "tmp");
fs.mkdirSync(TMP_DIR, { recursive: true });

function getPathInsensitive(obj, keyPath) {
  if (!obj || typeof keyPath !== "string") return undefined;
  const parts = keyPath.replace(/\[(\d+)\]/g, ".$1").split(".").map((s) => s.trim()).filter(Boolean);
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
    try {
      const val = getPathInsensitive(data, String(expr).trim());
      return val == null ? "" : String(val);
    } catch { return ""; }
  });
}

function parseBorderColor(border) {
  if (!border || typeof border !== "string") return null;
  const m = border.match(/(#[0-9a-fA-F]{3,8}|\brgba?\([^)]+\)|[a-zA-Z]+)/);
  return m ? m[1] : null;
}

async function fetchToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function dataUrlToBuffer(s) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(s || "");
  if (!m) return null;
  return Buffer.from(m[2], "base64");
}

async function loadImageSource(srcRaw) {
  const s = String(srcRaw || "").trim();
  if (!s) return null;
  const b64 = dataUrlToBuffer(s);
  if (b64) return { type: "buffer", value: b64 };
  if (/^https?:\/\//i.test(s)) return { type: "buffer", value: await fetchToBuffer(s) };
  const abs = path.isAbsolute(s) ? s : path.join(process.cwd(), s.replace(/^\/+/, ""));
  if (fs.existsSync(abs)) return { type: "path", value: abs };
  const pub = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "public", s);
  if (fs.existsSync(pub)) return { type: "path", value: pub };
  return null;
}

async function makePdfFromLayout({ layout, data, outPath }) {
  const doc = new PDFDocument({ size: "A4", margin: 10 });
  const stream = fs.createWriteStream(outPath);
  const done = new Promise((resolve, reject) => { stream.on("finish", () => resolve(outPath)); stream.on("error", reject); });
  doc.pipe(stream);

  const zones = layout?.structure?.zones || [];
  const pageW = doc.page.width, pageH = doc.page.height;
  const designW = Number(layout?.structure?.meta?.width || 794);
  const designH = Number(layout?.structure?.meta?.height || 1123);
  const s = Math.min(pageW / (designW || 1), pageH / (designH || 1));
  const offsetX = (pageW - designW * s) / 2;
  const offsetY = (pageH - designH * s) / 2;

  // Prefetch images
  const prepared = await Promise.all((zones || []).map(async (z) => {
    const type = z.type || "text"; let img = null;
    if (type === "image") {
      let src = z.isDynamic && z.variableName ? getPathInsensitive(data, String(z.variableName)) : null;
      if (!src) src = merge(z.value ?? z.content ?? z.text ?? "", data);
      try { img = await loadImageSource(src); } catch {}
    }
    return { z, img };
  }));

  for (const { z, img } of prepared) {
    const type = z.type || "text";
    const x = Math.round(Number(z.x ?? 36) * s + offsetX);
    const y = Math.round(Number(z.y ?? 36) * s + offsetY);
    const w = Math.round(Number(z.width ?? 200) * s);
    const h = Math.round(Number(z.height ?? 20) * s);

    if (type === "rect") {
      const fill = z.fill || z.styles?.backgroundColor || null;
      const stroke = z.stroke || parseBorderColor(z.styles?.border) || null;
      if (fill && fill !== "transparent") doc.save().fillColor(fill).rect(x, y, w, h).fill().restore();
      if (stroke) doc.save().strokeColor(stroke).rect(x, y, w, h).stroke().restore();
      continue;
    }

    if (type === "image") {
      if (img) {
        if (img.type === "buffer") doc.image(img.value, x, y, { width: w, height: h });
        else if (img.type === "path") doc.image(img.value, x, y, { width: w, height: h });
      }
      continue;
    }

    if (type === "table") {
      let table;
      if (z.isDynamic && z.variableName) table = getPathInsensitive(data, String(z.variableName));
      if (!table && z.content) { try { table = JSON.parse(String(z.content)); } catch {} }
      if (table && typeof table === "object") {
        const columns = Array.isArray(table.columns) ? table.columns : Object.keys((table.data?.[0] || {}));
        const rows = Array.isArray(table.data) ? table.data : (Array.isArray(table.rows) ? table.rows : (Array.isArray(table) ? table : []));
        const rowH = Math.max(16, Math.floor(h / Math.max(1, rows.length + 1)));
        doc.save().fontSize(Math.max(8, Math.floor(12 * s))).text(columns.join("  "), x + 2, y + 2, { width: w - 4 });
        let yy = y + rowH;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          let textRow;
          if (Array.isArray(row)) textRow = row.map((v) => String(v ?? "")).join("  ");
          else if (row && typeof row === "object") textRow = columns.map((c) => String(row[c] ?? "")).join("  ");
          else textRow = String(row ?? "");
          doc.text(textRow, x + 2, yy, { width: w - 4 });
          yy += rowH; if (yy > y + h - rowH) break;
        }
        doc.restore();
      }
      continue;
    }

    const raw = z.content ?? z.value ?? z.text ?? "";
    const text = merge(String(raw), data);
    const fontSize = Math.max(8, (Number(z.fontSize) || Number(z.styles?.fontSize) || 12) * s);
    const color = (typeof z.styles?.color === "string" && z.styles.color) || "#000000";
    const align = z.align || z.styles?.textAlign || "left";
    doc.fillColor(color).fontSize(fontSize).text(text, x, y, { width: w, height: h, align, ellipsis: true });
  }

  if (!zones || zones.length === 0) {
    doc.fontSize(18).text(layout?.name || "Layout PDF", { underline: true });
    doc.moveDown(); doc.fontSize(10).text(JSON.stringify(data, null, 2), { width: 520 });
  }

  doc.end();
  return await done;
}

// CRUD & rendering
router.get("/", async (req, res) => {
  try {
    const rows = await Layout.findAll({ where: { organizationId: req.orgId }, order: [["createdAt", "DESC"]] });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: "Failed to fetch layouts" }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, structure } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name required" });
    const saved = await Layout.create({ name, structure: structure || { zones: [] }, organizationId: req.orgId });
    res.status(201).json(saved);
  } catch (e) { res.status(500).json({ error: "Failed to save layout" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const row = await Layout.findOne({ where: { id: req.params.id, organizationId: req.orgId } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { res.status(500).json({ error: "Failed to fetch layout" }); }
});

router.post("/:id/render/pdf", async (req, res) => {
  try {
    const row = await Layout.findOne({ where: { id: req.params.id, organizationId: req.orgId } });
    if (!row) return res.status(404).json({ error: "Layout not found" });
    const layout = row.toJSON(); const { data = {}, filename } = req.body || {};
    const fname = filename || `layout-${row.id}-${Date.now()}.pdf`;
    const outPath = path.join(TMP_DIR, fname);
    await makePdfFromLayout({ layout, data, outPath });
    res.json({ file: `/tmp/${path.basename(outPath)}` });
  } catch (e) { res.status(500).json({ error: "Failed to render PDF", details: String(e) }); }
});

router.post("/:id/render/pdf-batch", async (req, res) => {
  try {
    const row = await Layout.findOne({ where: { id: req.params.id, organizationId: req.orgId } });
    if (!row) return res.status(404).json({ error: "Layout not found" });
    const layout = row.toJSON(); const { rows = [], filenamePrefix } = req.body || {};
    const stamp = Date.now(); const prefix = filenamePrefix || `layout-${row.id}`;
    const batchFolderName = `${prefix}-${stamp}`; const batchFolder = path.join(TMP_DIR, batchFolderName);
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
      output.on("close", resolve); zip.on("error", reject); zip.pipe(output); zip.directory(batchFolder, false); zip.finalize();
    });
    res.json({ files, zip: `/tmp/${path.basename(zipPath)}` });
  } catch (e) { res.status(500).json({ error: "Failed to render PDF batch", details: String(e) }); }
});

export default router;



