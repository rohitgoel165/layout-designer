// backend/controllers/deliveryController.js
import fs from "fs";
import path from "path";
import * as ftp from "basic-ftp";

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

function tryReadLocalFromTmp(s) {
  const rel = s.replace(/^\/+/, "");
  const underTmp = rel.startsWith("tmp/");
  if (!underTmp) return null;
  const filePath = path.resolve(process.cwd(), rel.replace(/^tmp\/+/i, "tmp/"));
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  let contentType = "application/octet-stream";
  if (/\.pdf$/i.test(filePath)) contentType = "application/pdf";
  else if (/\.zip$/i.test(filePath)) contentType = "application/zip";
  return { buf, contentType, filePath };
}

async function loadFileFromUrlOrLocal(input, req) {
  const s = String(input || "");
  // local tmp shortcut
  let local = tryReadLocalFromTmp(s);
  if (!local) {
    // handle absolute URL pointing to /tmp
    try {
      const u = new URL(s);
      if (u.pathname && u.pathname.startsWith("/tmp/")) {
        local = tryReadLocalFromTmp(u.pathname);
      }
    } catch {}
  }
  if (local) return { buffer: local.buf, contentType: local.contentType, filename: path.basename(local.filePath) };

  const abs = toAbsoluteUrl(s, req);
  const res = await fetch(abs);
  if (!res.ok) throw new Error(`fetch ${abs} failed: ${res.status}`);
  const arr = await res.arrayBuffer();
  const ct = res.headers.get("content-type") || undefined;
  let filename = path.basename(new URL(abs).pathname || "file");
  return { buffer: Buffer.from(arr), contentType: ct, filename };
}

export async function deliverApiHandler(req, res, next) {
  try {
    const { endpoint, method = "POST", headers = {}, data = {}, outputs = [], mode = "links" } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint required" });

    let body;
    let usedHeaders = { ...(headers || {}) };
    if (String(mode).toLowerCase() === "multipart") {
      // multipart with files
      const form = new (await import("form-data")).default();
      form.append("payload", JSON.stringify(data));
      for (let i = 0; i < outputs.length; i++) {
        const o = outputs[i] || {}; const url = o.url || o.file || o.href;
        if (!url) continue;
        try {
          const { buffer, filename } = await loadFileFromUrlOrLocal(url, req);
          form.append(o.fieldName || `file${i + 1}`, buffer, { filename: o.filename || filename });
        } catch {}
      }
      body = form;
      usedHeaders = { ...usedHeaders, ...form.getHeaders?.() };
    } else {
      // JSON with absolute URLs
      const outs = (outputs || []).map(o => ({ ...o, url: toAbsoluteUrl(o.url || o.file || o.href, req) }));
      body = JSON.stringify({ ...data, outputs: outs });
      usedHeaders = { "content-type": "application/json", ...usedHeaders };
    }

    const resp = await fetch(endpoint, { method, headers: usedHeaders, body });
    const text = await resp.text();
    res.status(resp.ok ? 200 : 502).type("application/json").send(JSON.stringify({ ok: resp.ok, status: resp.status, body: text }));
  } catch (e) { next(e); }
}

export async function deliverFtpHandler(req, res, next) {
  const { host, port = 21, user, password, secure = false, remoteDir = "/", files = [] } = req.body || {};
  if (!host) return res.status(400).json({ error: "host required" });
  const client = new ftp.Client(30000);
  try {
    await client.access({ host, port: Number(port), user, password, secure });
    if (remoteDir && remoteDir !== "/") {
      try { await client.ensureDir(remoteDir); } catch {}
      await client.cd(remoteDir);
    }
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i] || {}; const url = f.url || f.file || f.href;
      if (!url) continue;
      const { buffer, filename } = await loadFileFromUrlOrLocal(url, req);
      const name = f.filename || filename || `file-${i + 1}`;
      await client.uploadFrom(Buffer.from(buffer), name);
      uploaded.push({ name });
    }
    res.json({ ok: true, uploaded });
  } catch (e) {
    next(e);
  } finally { client.close(); }
}

export default { deliverApiHandler, deliverFtpHandler };