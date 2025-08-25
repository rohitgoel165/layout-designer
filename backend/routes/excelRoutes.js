// backend/routes/excelRoutes.js
import express from "express";
import multer from "multer";
import XLSX from "xlsx";

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// Multer: memory storage with filters/limits
// ──────────────────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const ok = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv",
      "application/csv",
    ].includes(file.mimetype);
    cb(ok ? null : new Error("Unsupported file type"), ok);
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const normalizeHeader = (h, idx) => {
  if (typeof h !== "string" || !h.trim()) return `col_${idx + 1}`;
  // make safe keys for JSON/templating: remove non-word, collapse spaces, camel-ish
  let s = h.trim().replace(/\s+/g, " ").replace(/[^\w\s.-]/g, "");
  if (!s) return `col_${idx + 1}`;
  // turn spaces/dots into underscores
  s = s.replace(/[.\s]+/g, "_");
  return s;
};

const isEmptyRow = (arr) => arr.every((v) => v === null || v === undefined || String(v).trim() === "");

const coerceValue = (v) => {
  if (v == null) return null;
  // Dates from XLSX with cellDates/raw:false often come as JS Date or string
  if (v instanceof Date && !isNaN(v)) return v.toISOString();
  if (typeof v === "string") {
    const s = v.trim();
    // Try parse ISO-ish dates coming as strings
    const d = new Date(s);
    if (!isNaN(d) && /\d{4}-\d{1,2}-\d{1,2}/.test(s)) return d.toISOString();
    return s;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v;
  return v;
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /layout-be/api/excel
// Body (form-data):
//   - file: (required) .xlsx/.xls/.csv
//   - sheetName?: string
//   - sheetIndex?: number (0-based)
//   - headerRow?: number (1-based; default auto-detect)
//   - maxRows?: number (default 5000)
// ──────────────────────────────────────────────────────────────────────────────
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true, // prefer real Date objects
      raw: false,      // let xlsx do basic parsing
    });

    let sheetName = req.body.sheetName;
    let sheetIndex = Number.isFinite(Number(req.body.sheetIndex))
      ? Number(req.body.sheetIndex)
      : 0;

    if (!sheetName) {
      sheetName = workbook.SheetNames[sheetIndex] || workbook.SheetNames[0];
      sheetIndex = workbook.SheetNames.indexOf(sheetName);
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return res.status(400).json({ error: `Sheet "${sheetName}" not found` });
    }

    // Read as array-of-arrays to control header handling
    const aoa = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
      raw: false,
    });

    if (!aoa.length) return res.json({ sheetName, sheetIndex, headers: [], rows: [], count: 0 });

    // Determine header row
    let headerRowIdx;
    if (req.body.headerRow) {
      const hr = Number(req.body.headerRow);
      headerRowIdx = Number.isInteger(hr) && hr > 0 ? hr - 1 : 0;
    } else {
      // auto-detect: if first row has at least one non-empty string -> treat as headers
      const first = aoa[0] || [];
      const hasText = first.some((c) => typeof c === "string" && c.trim() !== "");
      headerRowIdx = hasText ? 0 : -1; // -1 => no explicit headers
    }

    const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
    const headerSource = headerRowIdx >= 0 ? aoa[headerRowIdx] : (aoa[0] || []);
    const maxCols = Math.max(...aoa.map((r) => r.length));

    const headers = Array.from({ length: maxCols }).map((_, i) =>
      normalizeHeader(headerSource[i], i)
    );

    // Build rows
    const maxRows = Number.isFinite(Number(req.body.maxRows)) ? Number(req.body.maxRows) : 5000;
    const rows = [];
    for (let r = dataStart; r < aoa.length && rows.length < maxRows; r++) {
      const row = aoa[r] || [];
      if (isEmptyRow(row)) continue;
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = coerceValue(row[c]);
      }
      rows.push(obj);
    }

    return res.json({
      sheetName,
      sheetIndex,
      headers,
      rows,
      count: rows.length,
    });
  } catch (err) {
    console.error("POST /excel error", err);
    const message = err?.message || String(err);
    return res.status(500).json({ error: "Failed to parse excel", details: message });
  }
});

export default router;
