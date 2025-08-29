// ESM controller – no node-fetch needed
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Helper to build an absolute URL using request context or env
function toAbsoluteUrl(input, req) {
  if (!input) return null;
  const s = String(input);
  if (/^https?:\/\//i.test(s)) return s;
  const base =
    process.env.PUBLIC_BASE_URL ||
    process.env.API_PUBLIC_BASE ||
    (req && `${(req.headers["x-forwarded-proto"] || req.protocol || "http").toString()}://${(req.headers["x-forwarded-host"] || req.headers.host || "localhost").toString()}`);
  if (!base) return s; // best effort
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

/** Build SMTP transporter (Mailtrap or your SMTP) */
function makeTransport() {
  const host = process.env.SMTP_HOST || process.env.MAILTRAP_HOST;
  const port = Number(process.env.SMTP_PORT || 2525);
  const user = process.env.SMTP_USER || process.env.MAILTRAP_USER;
  const pass = process.env.SMTP_PASS || process.env.MAILTRAP_PASS;
  if (!host) throw new Error("SMTP_HOST (or MAILTRAP_HOST) not configured");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function defaultNameFromType(ct, i) {
  if (!ct) return `file-${i + 1}`;
  if (ct.includes("pdf")) return `document-${i + 1}.pdf`;
  if (ct.includes("zip")) return `archive-${i + 1}.zip`;
  if (ct.startsWith("image/")) return `image-${i + 1}.${(ct.split("/")[1] || "png")}`;
  return `file-${i + 1}`;
}

/** Fetch a URL to Buffer using the native fetch (Node 18+) */
async function fetchUrlToBuffer(url) {
  const res = await fetch(url, {
    headers: { accept: "application/pdf,application/zip,application/octet-stream,*/*" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText} ${text?.slice?.(0,200)}`);
  }
  const arr = await res.arrayBuffer();
  return {
    buf: Buffer.from(arr),
    contentType: res.headers.get("content-type") || undefined,
  };
}

function tryReadLocalFromTmp(s) {
  // Accept forms like "/tmp/file.pdf" or "tmp/file.pdf"
  const rel = s.replace(/^\/+/, "");
  const underTmp = rel.startsWith("tmp/");
  if (!underTmp) return null;
  const filePath = path.resolve(process.cwd(), rel.replace(/^tmp\/+/i, "tmp/"));
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  let contentType = "application/octet-stream";
  if (/\.pdf$/i.test(filePath)) contentType = "application/pdf";
  else if (/\.zip$/i.test(filePath)) contentType = "application/zip";
  return { buf, contentType };
}

/** Normalize an attachment object into { filename, content:Buffer, contentType? } */
async function normalizeAttachment(att, i, req) {
  let { filename } = att || {};
  let content;
  let contentType;

  const v = att?.content;

  if (typeof v === "string") {
    const s = v.trim();

    // data URL: data:<type>;base64,<payload>
    const m = s.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      contentType = m[1];
      content = Buffer.from(m[2], "base64");
      filename = filename || defaultNameFromType(contentType, i);
      return { filename, content, contentType };
    }

    // Local tmp file shortcut (most common case)
    let local = tryReadLocalFromTmp(s);
    if (!local) {
      // If it's an absolute URL that points to /tmp/*, map to local file
      try {
        const u = new URL(s);
        if (u.pathname && u.pathname.startsWith("/tmp/")) {
          local = tryReadLocalFromTmp(u.pathname);
        }
      } catch {}
    }
    if (local) {
      contentType = local.contentType;
      filename = filename || defaultNameFromType(contentType, i);
      return { filename, content: local.buf, contentType };
    }

    // http(s) URL or other relative path
    if (/^(https?:)?\/\//i.test(s) || s.startsWith("/")) {
      const abs = toAbsoluteUrl(s, req);
      const { buf, contentType: ct } = await fetchUrlToBuffer(abs);
      contentType = ct;
      filename = filename || defaultNameFromType(contentType, i);
      return { filename, content: buf, contentType };
    }

    // raw base64 (no data URL header)
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(s)) {
      content = Buffer.from(s.replace(/\s+/g, ""), "base64");
      filename = filename || `file-${i + 1}`;
      return { filename, content };
    }

    // plain text fallback
    return {
      filename: filename || `file-${i + 1}.txt`,
      content: Buffer.from(s, "utf8"),
      contentType: "text/plain",
    };
  }

  if (Buffer.isBuffer(v)) {
    return { filename: filename || `file-${i + 1}`, content: v };
  }

  // empty fallback to avoid crashes
  return {
    filename: filename || `file-${i + 1}.txt`,
    content: Buffer.from("", "utf8"),
    contentType: "text/plain",
  };
}

export async function sendEmailHandler(req, res, next) {
  try {
    const { to, subject, text, attachments = [] } = req.body || {};
    if (!to) return res.status(400).json({ error: "'to' is required" });

    const normalized = await Promise.all(
      (attachments || []).map((a, i) => normalizeAttachment(a, i, req))
    );

    const transporter = makeTransport();
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_FROM || "no-reply@example.com",
      to,
      subject: subject || "Workflow outputs",
      text: text || "",
      attachments: normalized,
    });

    res.json({
      ok: true,
      sent: true,
      attachments: normalized.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.content?.length,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export default { sendEmailHandler };
