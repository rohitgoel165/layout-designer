// backend/routes/yogiRoutes.js
import express from "express";
import { Readable } from "node:stream";

const router = express.Router();

const BASE = (process.env.YOGI_BASE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.YOGI_BEARER_TOKEN || "";
const TIMEOUT_MS = Number(process.env.YOGI_TIMEOUT_MS ?? 15000);

if (!BASE || !TOKEN) {
  console.warn("[yogiRoutes] YOGI_BASE_URL or YOGI_BEARER_TOKEN is missing in env");
}

// Pick/forward a small set of harmless headers
const forwardHeaders = (req) => {
  const h = new Headers();
  // Always set Accept; default to JSON
  h.set("accept", req.headers["accept"] || "application/json");
  // Multi-tenant: forward org and some tracing headers if present
  if (req.orgId) h.set("x-org-id", String(req.orgId));
  const pass = [
    "user-agent",
    "x-request-id",
    "x-correlation-id",
    "x-trace-id",
    "accept-language",
  ];
  for (const k of pass) {
    const v = req.headers[k];
    if (v) h.set(k, String(v));
  }
  // Auth: always override with Yogi bearer
  h.set("authorization", `Bearer ${TOKEN}`);
  // Only set content-type when we actually send a body
  return h;
};

// Build fetch init with timeout + optional JSON body
const buildInit = (req, methodOverride) => {
  const method = methodOverride || req.method || "GET";
  const headers = forwardHeaders(req);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const init = { method, headers, signal: controller.signal };

  // Only forward JSON / URL-encoded bodies we can safely re-create.
  // (Multipart/form-data should be proxied with a raw body stream; not supported here.)
  const ct = (req.headers["content-type"] || "").toLowerCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  if (hasBody) {
    if (ct.startsWith("application/json")) {
      headers.set("content-type", "application/json");
      init.body = JSON.stringify(req.body ?? {});
    } else if (ct.startsWith("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(req.body ?? {})) {
        params.append(k, String(v));
      }
      headers.set("content-type", "application/x-www-form-urlencoded");
      init.body = params.toString();
    } else if (ct.startsWith("text/plain") && typeof req.body === "string") {
      headers.set("content-type", "text/plain; charset=utf-8");
      init.body = req.body;
    }
    // else: skip body (unsupported type) to avoid corrupting uploads
  }

  return { init, controller, timeout };
};

// GET /layout-be/api/yogi  → GET BASE/
router.get("/", async (req, res) => {
  try {
    const url = `${BASE}/`;
    const { init, controller, timeout } = buildInit(req, "GET");
    const upstream = await fetch(url, init).finally(() => clearTimeout(timeout));

    // Mirror status + content-type; stream when possible
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.status(upstream.status);
    res.set("content-type", ct);
    const len = upstream.headers.get("content-length");
    if (len) res.set("content-length", len);

    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.send(buf);
    }
  } catch (err) {
    const code = err?.name === "AbortError" ? 504 : 502;
    res.status(code).json({ error: "upstream_error", details: String(err) });
  }
});

// Wildcard proxy: /layout-be/api/yogi/* → BASE/*
router.use("/:path(*)", async (req, res) => {
  try {
    const subpath = req.params.path || "";
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const url = `${BASE}/${subpath}${qs}`;

    const { init, controller, timeout } = buildInit(req);
    const upstream = await fetch(url, init).finally(() => clearTimeout(timeout));

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.status(upstream.status);
    res.set("content-type", ct);
    const len = upstream.headers.get("content-length");
    if (len) res.set("content-length", len);

    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.send(buf);
    }
  } catch (err) {
    const code = err?.name === "AbortError" ? 504 : 502;
    res.status(code).json({ error: "upstream_error", details: String(err) });
  }
});

export default router;
