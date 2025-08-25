// backend/routes/qrRoutes.js
import express from "express";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const QRCode = require("qrcode");              // CJS – safe via createRequire
const archiver = require("archiver");          // CJS – safe via createRequire
const nodemailer = require("nodemailer");      // CJS – safe via createRequire

const router = express.Router();

/* ───────────── helpers ───────────── */
const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const safeInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

/* ───────────── routes ───────────── */

// POST /layout-be/api/qr  -> single QR (returns dataUrl)
router.post("/", async (req, res) => {
  try {
    const { text, size = 300 } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });
    const width = safeInt(size, 300);

    const dataUrl = await QRCode.toDataURL(String(text), { width });
    return res.json({ dataUrl });
  } catch (err) {
    console.error("POST /qr error:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate QR", details: String(err) });
  }
});

// POST /layout-be/api/qr/batch  -> array of rows -> PNGs + zip (returns dataUrls + /tmp zip)
router.post("/batch", express.json({ limit: "10mb" }), async (req, res) => {
  try {
    const { templateId, rows, encodeAs = "json", customTemplate, size = 300 } =
      req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided" });
    }
    const width = safeInt(size, 300);

    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let textToEncode;

      if (encodeAs === "json") {
        textToEncode = JSON.stringify({ templateId, row });
      } else if (encodeAs === "custom" && customTemplate) {
        textToEncode = String(customTemplate).replace(
          /\{\{(.+?)\}\}/g,
          (_, key) => String(row[String(key).trim()] ?? "")
        );
      } else {
        textToEncode = JSON.stringify(row);
      }

      const dataUrl = await QRCode.toDataURL(textToEncode, { width });
      results.push({ rowIndex: i, dataUrl, textEncoded: textToEncode });
    }

    // Zip the PNGs
    const zipName = `qrs-${Date.now()}.zip`;
    const zipPath = path.join(TMP_DIR, zipName);
    const output = fs.createWriteStream(zipPath);
    const zip = archiver("zip", { zlib: { level: 9 } });

    const zipDone = new Promise((resolve, reject) => {
      output.on("close", resolve);
      output.on("error", reject);
    });

    zip.pipe(output);
    results.forEach((r, idx) => {
      const base64 = r.dataUrl.split(",")[1] || "";
      const buf = Buffer.from(base64, "base64");
      zip.append(buf, { name: `qr-${idx + 1}.png` });
    });
    await zip.finalize();
    await zipDone;

    return res.json({ results, zip: `/tmp/${zipName}` });
  } catch (err) {
    console.error("POST /qr/batch error:", err);
    return res
      .status(500)
      .json({ error: "Batch QR generation failed", details: String(err) });
  }
});

// POST /layout-be/api/qr/send-email  -> email dataURL attachments
router.post("/send-email", express.json({ limit: "10mb" }), async (req, res) => {
  try {
    const { to, subject, text, attachments } = req.body || {};
    if (!to) return res.status(400).json({ error: "Recipient required" });

    // Basic SMTP config from env (Compose/Pod injects these)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });

    const safeAttachments = (attachments || []).map((a) => {
      if (a?.content?.startsWith?.("data:")) {
        const [meta, data] = a.content.split(",", 2);
        const m = /data:(.+);base64/.exec(meta);
        const mime = (m && m[1]) || "application/octet-stream";
        return {
          filename: a.filename || "attachment.png",
          content: Buffer.from(data || "", "base64"),
          contentType: mime,
        };
      }
      return a;
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: subject || "QR codes",
      text: text || "",
      attachments: safeAttachments,
    });

    return res.json({ ok: true, info });
  } catch (err) {
    console.error("POST /qr/send-email error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send email", details: String(err) });
  }
});

export default router;
