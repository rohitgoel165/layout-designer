// src/api.ts

// ---------- Single dynamic API base
declare global {
  interface Window {
    __API_BASE__?: string;
  }
}

// Priority: window.__API_BASE__ (public/config.js) -> VITE_API_BASE -> "/api"
const fromWindow =
  typeof window !== "undefined" ? (window as any).__API_BASE__ : undefined;
const fromVite =
  typeof import.meta !== "undefined"
    ? (import.meta as any)?.env?.VITE_API_BASE
    : undefined;

// normalized base without trailing slash
export const API_BASE = String(fromWindow || fromVite || "/api").replace(
  /\/+$/,
  ""
);

// Small helper if you want to build endpoints safely
const api = (p: string) => `${API_BASE}/${p.replace(/^\/+/, "")}`;

// Precompute the origin we’ll use to turn server-returned “/tmp/…pdf|zip”
// into a fully-qualified URL (important for email attachments).
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
})();

/** Turn "/tmp/xxx.pdf" (or any relative path) into a full URL. */
export function absoluteUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_ORIGIN}${p}`;
}

// ---- Auth-aware fetch
import { authFetch } from "./auth";

// ---------------- Types shared in this file ----------------

export type SavedLayout = {
  _id?: string;
  id?: string;
  name: string;
  structure?: any; // typically { zones: LayoutZone[] }
};

type Json = any;

/* ---------------- LAYOUTS ---------------- */

/** GET /api/layouts -> returns saved layouts array */
export async function getLayouts(): Promise<SavedLayout[]> {
  const res = await authFetch(api("/layouts"));
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch layouts: ${res.status} ${txt}`);
  }
  return res.json();
}

/** POST /api/layouts -> save layout (payload: { name, structure }) */
export async function saveLayout(payload: {
  name: string;
  structure: any;
}): Promise<Json> {
  const res = await authFetch(api("/layouts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to save layout: ${res.status} ${txt}`);
  }
  return res.json();
}

/* ---------------- EXCEL / QR ---------------- */

/** POST /api/excel -> upload an Excel file (form field name = "file") */
export async function uploadExcel(
  file: File,
  sheetName?: string
): Promise<Json> {
  const form = new FormData();
  form.append("file", file);
  if (sheetName) form.append("sheetName", sheetName);

  const res = await authFetch(api("/excel"), {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to upload Excel: ${res.status} ${txt}`);
  }

  return res.json(); // { rows: [...] }
}

/** POST /api/qr -> generate single QR code for given text */
export async function generateQRCode(
  text: string,
  size?: number
): Promise<{ dataUrl?: string } & Json> {
  const res = await authFetch(api("/qr"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, size }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to generate QR code: ${res.status} ${txt}`);
  }

  return res.json();
}

/**
 * POST /api/qr/batch
 * payload: { templateId?: string, rows: any[], encodeAs?: 'json'|'custom'|'url', customTemplate?: string }
 * returns: { results: [{ rowIndex, dataUrl, textEncoded }], zip: '/tmp/<file>.zip' }
 */
export async function batchGenerateQRCodes(payload: {
  templateId?: string;
  rows: any[];
  encodeAs?: "json" | "custom" | "url";
  customTemplate?: string;
}): Promise<{
  results: Array<{ rowIndex: number; dataUrl: string; textEncoded: string }>;
  zip?: string;
}> {
  const res = await authFetch(api("/qr/batch"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Batch QR generation failed: ${res.status} ${txt}`);
  }

  return res.json();
}

/**
 * EMAIL-ONLY: POST /api/notify/email
 * payload: { to: string, subject?: string, text?: string, attachments?: [{ filename, content: dataUrl }] }
 */
export async function sendEmail(payload: {
  to: string;
  subject?: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string }>; // content can be a data URL
}): Promise<Json> {
  const res = await authFetch(api("/notify/email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Send email failed: ${res.status} ${txt}`);
  }

  return res.json();
}

/** helper to download a data URL (client side) */
export function downloadDataUrl(dataUrl: string, filename = "qrcode.png") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---------------- RENDERING (layouts) ---------------- */

export async function renderPdf(payload: {
  layoutId: string;
  data: any;
  filename?: string;
}): Promise<{ file: string; filename: string }> {
  const res = await authFetch(api("/render/pdf"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(`Render PDF failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function renderPdfBatch(payload: {
  layoutId: string;
  rows: any[];
  filenamePrefix?: string;
}): Promise<{
  files: Array<{ rowIndex: number; filename: string; file: string }>;
  zip: string;
}> {
  const res = await authFetch(api("/render/batch"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(
      `Render batch failed: ${res.status} ${await res.text()}`
    );
  return res.json();
}

export async function renderLayoutPdf(
  layoutId: string,
  data: any,
  filename?: string
): Promise<{ file: string }> {
  const res = await authFetch(api(`/layouts/${layoutId}/render/pdf`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, filename }),
  });
  if (!res.ok)
    throw new Error(`Render PDF failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function renderLayoutPdfBatch(
  layoutId: string,
  rows: any[],
  filenamePrefix?: string
): Promise<{ files: Array<{ index: number; file: string }>; zip?: string }> {
  const res = await authFetch(api(`/layouts/${layoutId}/render/pdf-batch`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, filenamePrefix }),
  });
  if (!res.ok)
    throw new Error(
      `Render PDF batch failed: ${res.status} ${await res.text()}`
    );
  return res.json();
}

/** helper to construct full zip url returned as /tmp/<name>.zip from backend */
export function zipDownloadUrl(zipPath?: string): string | null {
  return absoluteUrl(zipPath);
}

/* ---------------- WORKFLOWS ---------------- */

/** What the backend stores/returns for workflows. Dates can be strings. */
export type WorkflowRecord = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  nodes?: any[];
  connections?: any[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  isActive?: boolean;
  tags?: string[];
  // optional top-level settings some UIs persist
  outputFormats?: string[];
  deliveryMode?: string;
};

export async function getWorkflows(): Promise<WorkflowRecord[]> {
  const res = await authFetch(api("/workflows"), { method: "GET" });
  if (!res.ok)
    throw new Error(
      `Failed to fetch workflows: ${res.status} ${await res.text()}`
    );
  return res.json();
}

/**
 * Create or update a workflow.
 * - If `id` or `_id` is present → PUT /workflows/:id
 * - Else → POST /workflows
 */
export async function upsertWorkflow(
  rec: WorkflowRecord
): Promise<WorkflowRecord> {
  const id = rec.id || rec._id;

  // Always send ISO timestamps so the backend can store strings safely
  const nowIso = new Date().toISOString();
  const body = JSON.stringify({
    ...rec,
    createdAt: rec.createdAt ?? nowIso,
    updatedAt: nowIso,
  });

  if (id) {
    const putRes = await authFetch(api(`/workflows/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (putRes.ok) return putRes.json();

    // If backend doesn’t support PUT or record missing, try create
    if ([404, 405, 400].includes(putRes.status)) {
      const postRes = await authFetch(api("/workflows"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!postRes.ok) {
        throw new Error(
          `Create workflow failed: ${postRes.status} ${await postRes.text()}`
        );
      }
      return postRes.json();
    }

    throw new Error(
      `Update workflow failed: ${putRes.status} ${await putRes.text()}`
    );
  }

  // No id → create
  const postRes = await authFetch(api("/workflows"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!postRes.ok)
    throw new Error(
      `Create workflow failed: ${postRes.status} ${await postRes.text()}`
    );
  return postRes.json();
}

/* ---------------- WORKFLOW EXECUTIONS (JOBS) ---------------- */

export type WorkflowExecutionRecord = {
  _id?: string;
  jobId?: string;
  id?: string;
  workflowId: string;
  workflowName?: string;
  type?: string;
  status?: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  startTime?: string | Date;
  endTime?: string | Date;
  inputData?: any;
  outputData?: any;
  logs?: Array<{
    timestamp?: string | Date;
    level?: "info" | "warning" | "error" | string;
    message?: string;
    nodeId?: string;
  }>;
  results?: Array<{
    nodeId?: string;
    outputType?: string;
    data?: any;
    url?: string;
    error?: string;
  }>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export async function listExecutions(params?: {
  workflowId?: string;
  status?: string;
  limit?: number;
}): Promise<WorkflowExecutionRecord[]> {
  const u = new URL(api("/workflow-executions"), window.location.origin);
  if (params?.workflowId) u.searchParams.set("workflowId", params.workflowId);
  if (params?.status)     u.searchParams.set("status", params.status);
  if (params?.limit)      u.searchParams.set("limit", String(params.limit));
  const res = await authFetch(u.toString());
  if (!res.ok) throw new Error(`listExecutions failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getExecution(id: string): Promise<WorkflowExecutionRecord> {
  const res = await authFetch(api(`/workflow-executions/${id}`));
  if (!res.ok) throw new Error(`getExecution failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function deleteExecution(id: string): Promise<{ ok: boolean }> {
  const res = await authFetch(api(`/workflow-executions/${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteExecution failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function recordWorkflowExecution(
  exec: Partial<WorkflowExecutionRecord>
): Promise<WorkflowExecutionRecord> {
  if (!exec.workflowId) throw new Error("recordWorkflowExecution: 'workflowId' is required");
  const res = await authFetch(api(`/workflow-executions`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exec),
  });
  if (!res.ok) throw new Error(`recordWorkflowExecution failed: ${res.status} ${await res.text()}`);
  return res.json();
}
