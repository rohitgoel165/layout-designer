// src/components/WorkflowDesigner.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import {
  Play,
  Trash2,
  Database,
  FileText,
  Globe,
  Smartphone,
  QrCode,
  Download,
  Zap,
  Square,
  RotateCcw,
  Plus,
} from "lucide-react";

import { LayoutZone } from "./LayoutDesigner";
import {
  getLayouts,
  getWorkflows,
  upsertWorkflow,
  recordWorkflowExecution,
  uploadExcel,
  generateQRCode,
  batchGenerateQRCodes,
  zipDownloadUrl,
  sendEmail,
  downloadDataUrl,
  renderLayoutPdf,
  renderLayoutPdfBatch,
} from "../api";
import type { WorkflowRecord } from "../api";

/* ---------- Compact UI constants ---------- */
const COMPACT = true;
const PANEL_FONT = COMPACT ? "text-xs" : "text-sm";
const LEFT_WIDTH = COMPACT ? "w-60" : "w-72";
const RIGHT_WIDTH = COMPACT ? "w-72" : "w-80";
const GRID_SIZE = COMPACT ? 16 : 20;
const NODE_DEFAULT = COMPACT ? { w: 160, h: 96 } : { w: 220, h: 140 };
const BTN_COMPACT = "h-8 px-2 text-[12px]";
const LABEL_SM = "text-[11px]";

/* ---------- types ---------- */

export interface WorkflowNode {
  id: string;
  type: "input" | "processing" | "output";
  subtype: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  config: Record<string, any>;
  inputs: Array<{ id: string; label: string; type: string; connected?: boolean }>;
  outputs: Array<{ id: string; label: string; type: string; connected?: boolean }>;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourceOutputId: string;
  targetNodeId: string;
  targetInputId: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  startTime: Date;
  endTime?: Date;
  inputData?: any;
  outputData?: any;
  logs: Array<{
    timestamp: Date;
    level: "info" | "warning" | "error";
    message: string;
    nodeId?: string;
  }>;
  results: Array<{
    nodeId: string;
    outputType: string;
    data?: any;
    url?: string;
    error?: string;
  }>;
}

/** Saved layout shape used in this component and API */
export type SavedLayout = {
  _id?: string;
  id?: string;
  name: string;
  structure?: { zones?: LayoutZone[] } | any;
};

/* ---------- props ---------- */
interface WorkflowDesignerProps {
  layouts?: SavedLayout[];
  onExecuteWorkflow: (workflow: Workflow, inputData?: any) => void;
  onSaveWorkflow: (workflow: Workflow) => void;
}

/* ---------- helpers: map UI Workflow <-> API WorkflowRecord ---------- */

function toWorkflowRecord(wf: Workflow): WorkflowRecord {
  return {
    id: wf.id || undefined,
    name: wf.name,
    description: wf.description,
    nodes: wf.nodes.map((n) => ({
      ...n,
      // strip transient file objects before sending to backend
      config: n.config && n.config.__file ? { ...n.config, __file: undefined } : n.config,
    })),
    connections: wf.connections,
    createdAt: wf.createdAt?.toISOString?.() ?? wf.createdAt,
    updatedAt: new Date().toISOString(),
    isActive: wf.isActive,
    tags: wf.tags,
  };
}

function fromWorkflowRecord(rec: WorkflowRecord, fallback?: Workflow): Workflow {
  const base: Workflow =
    fallback ??
    ({
      id: "",
      name: "New Workflow",
      description: "",
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      tags: [],
    } as Workflow);

  return {
    ...base,
    id: String(rec._id || rec.id || base.id),
    name: rec.name ?? base.name,
    description: rec.description ?? base.description,
    nodes: (rec as any).nodes ?? base.nodes,
    connections: (rec as any).connections ?? base.connections,
    createdAt: rec.createdAt ? new Date(rec.createdAt) : base.createdAt,
    updatedAt: rec.updatedAt ? new Date(rec.updatedAt) : new Date(),
    isActive: rec.isActive ?? base.isActive,
    tags: rec.tags ?? base.tags,
  };
}

/* ---------- component ---------- */

export function WorkflowDesigner({
  layouts: initialLayouts = [],
  onExecuteWorkflow,
  onSaveWorkflow,
}: WorkflowDesignerProps) {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>({
    id: "",
    name: "New Workflow",
    description: "",
    nodes: [],
    connections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    tags: [],
  });

  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(initialLayouts ?? []);

  // saved workflows (for dropdown)
  const [workflowsList, setWorkflowsList] = useState<WorkflowRecord[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const selectedWorkflowId = String(currentWorkflow.id || "");

  // name validation (mandatory + unique)
  const nameError = useMemo(() => {
    const nm = (currentWorkflow.name || "").trim();
    if (!nm) return "Workflow name is required.";
    const clash = workflowsList.some((w) => {
      const wid = String(w._id || w.id || "");
      if (wid && wid === currentWorkflow.id) return false;
      return (w.name || "").trim().toLowerCase() === nm.toLowerCase();
    });
    return clash ? "A workflow with this name already exists." : "";
  }, [currentWorkflow.name, currentWorkflow.id, workflowsList]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; outputId: string } | null>(null);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<Array<{ rowIndex: number; dataUrl: string; textEncoded: string }>>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  /* node templates */
  const nodeTemplates = {
    input: [
      {
        subtype: "excel",
        label: "Excel Input",
        icon: FileText,
        inputs: [],
        outputs: [{ id: "data", label: "Data", type: "tabular" }],
        config: { filePath: "", sheetName: "Sheet1", hasHeaders: true, __file: null, __fileDataUrl: null, __rows: null },
      },
      {
        subtype: "csv",
        label: "CSV Input",
        icon: FileText,
        inputs: [],
        outputs: [{ id: "data", label: "Data", type: "tabular" }],
        config: { filePath: "", delimiter: ",", hasHeaders: true, __file: null },
      },
      {
        subtype: "xml",
        label: "XML Input",
        icon: FileText,
        inputs: [],
        outputs: [{ id: "data", label: "Data", type: "structured" }],
        config: { filePath: "", rootElement: "", namespaces: {} },
      },
      {
        subtype: "api",
        label: "API Input",
        icon: Globe,
        inputs: [],
        outputs: [{ id: "data", label: "Data", type: "json" }],
        config: { url: "", method: "GET", headers: {}, authentication: {} },
      },
    ],
    processing: [
      {
        subtype: "template",
        label: "Layout Template",
        icon: Square,
        inputs: [{ id: "data", label: "Data", type: "any" }],
        outputs: [{ id: "processed", label: "Processed", type: "document" }],
        config: { templateId: "", variableMapping: {} },
      },
      {
        subtype: "transform",
        label: "Data Transform",
        icon: Zap,
        inputs: [{ id: "data", label: "Data", type: "any" }],
        outputs: [{ id: "transformed", label: "Transformed", type: "any" }],
        config: { script: "", language: "javascript" },
      },
    ],
    output: [
      {
        subtype: "pdf",
        label: "PDF Output",
        icon: FileText,
        inputs: [{ id: "data", label: "Data", type: "document" }],
        outputs: [],
        config: { filename: "output.pdf", quality: "high" },
      },
      {
        subtype: "html",
        label: "HTML Output",
        icon: Globe,
        inputs: [{ id: "data", label: "Data", type: "document" }],
        outputs: [],
        config: { filename: "output.html", responsive: true },
      },
      {
        subtype: "qrcode",
        label: "QR Code",
        icon: QrCode,
        inputs: [{ id: "data", label: "Data", type: "any" }],
        outputs: [],
        config: { size: 256, errorCorrection: "M" },
      },
      {
        subtype: "mobile",
        label: "Mobile App",
        icon: Smartphone,
        inputs: [{ id: "data", label: "Data", type: "document" }],
        outputs: [],
        config: { platform: "both", bundleId: "", appName: "" },
      },
      {
        subtype: "headless",
        label: "Headless API",
        icon: Database,
        inputs: [{ id: "data", label: "Data", type: "any" }],
        outputs: [],
        config: { endpoint: "", format: "json", authentication: {} },
      },
    ],
  } as const;

  /* ---------- node management ---------- */
  const addNode = useCallback((type: "input" | "processing" | "output", subtype: string) => {
    const template = (nodeTemplates as any)[type].find((t: any) => t.subtype === subtype);
    if (!template) return;

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      subtype,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: NODE_DEFAULT.w,
      height: NODE_DEFAULT.h,
      label: template.label,
      config: { ...template.config },
      inputs: template.inputs.map((i: any) => ({ ...i, connected: false })),
      outputs: template.outputs.map((o: any) => ({ ...o, connected: false })),
    };

    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: new Date(),
    }));
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === nodeId ? { ...node, ...updates } : node)),
      updatedAt: new Date(),
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((node) => node.id !== nodeId),
      connections: prev.connections.filter((conn) => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId),
      updatedAt: new Date(),
    }));
    setSelectedNode(null);
  }, []);

  /* dragging/connection handlers */
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      setSelectedNode(nodeId);
      setIsDragging(true);

      const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDragOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      });
    },
    [currentWorkflow.nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedNode) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;
      updateNode(selectedNode, { x: Math.max(0, newX), y: Math.max(0, newY) });
    },
    [isDragging, selectedNode, dragOffset, updateNode]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const startConnection = useCallback((nodeId: string, outputId: string) => {
    setIsConnecting(true);
    setConnectionStart({ nodeId, outputId });
  }, []);

  const completeConnection = useCallback(
    (nodeId: string, inputId: string) => {
      if (!connectionStart) return;
      const newConnection: WorkflowConnection = {
        id: `conn-${Date.now()}`,
        sourceNodeId: connectionStart.nodeId,
        sourceOutputId: connectionStart.outputId,
        targetNodeId: nodeId,
        targetInputId: inputId,
      };
      setCurrentWorkflow((prev) => ({ ...prev, connections: [...prev.connections, newConnection], updatedAt: new Date() }));
      setIsConnecting(false);
      setConnectionStart(null);
    },
    [connectionStart]
  );

  const selectedNodeData = currentWorkflow.nodes.find((n) => n.id === selectedNode);

  /* ---------- loaders ---------- */
  const fetchSavedLayouts = useCallback(async () => {
    try {
      const data = await getLayouts();
      setSavedLayouts(Array.isArray(data) ? (data as SavedLayout[]) : []);
    } catch (err) {
      console.error("Failed to fetch layouts", err);
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoadingWorkflows(true);
      const items = await getWorkflows();
      setWorkflowsList(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error("Failed to fetch workflows", e);
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, []);

  const loadWorkflowIntoCanvas = useCallback(
    (rec: WorkflowRecord) => {
      const normalized = fromWorkflowRecord(rec, currentWorkflow);
      setCurrentWorkflow((prev) => ({
        ...normalized,
        nodes: normalized.nodes.map((n) => {
          const prevMatch = prev.nodes.find((p) => p.id === n.id);
          if (!prevMatch) return n;
          return {
            ...n,
            config: { ...n.config, __file: prevMatch.config?.__file, __fileDataUrl: prevMatch.config?.__fileDataUrl, __rows: prevMatch.config?.__rows },
          };
        }),
      }));
      setSelectedNode(null);
    },
    [currentWorkflow]
  );

  const makeNewWorkflow = () => {
    setCurrentWorkflow({
      id: "",
      name: "New Workflow",
      description: "",
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      tags: [],
    });
    setSelectedNode(null);
  };

  useEffect(() => {
    setSavedLayouts(initialLayouts ?? []);
    fetchSavedLayouts();
    fetchWorkflows();
  }, [initialLayouts, fetchSavedLayouts, fetchWorkflows]);

  /* ---------- ESC cancels an in-progress connection ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsConnecting(false);
        setConnectionStart(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ---------- helpers ---------- */
  const fileFromDataUrl = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "application/octet-stream" });
  };

  /* ---------- workflow execution (simple runner) ---------- */
  const runWorkflow = useCallback(
    async (inputData?: any) => {
      try {
        setBatchResults([]);
        setZipUrl(null);
        setQrDataUrl(null);

        // Excel handling (survives node switches)
        const excelNodes = currentWorkflow.nodes.filter((n) => n.subtype === "excel");
        let excelData: any[] | null = null;

        if (excelNodes.length > 0) {
          const excelNode = excelNodes[0];
          let file: File | null = excelNode.config?.__file || null;

          if (!file && excelNode.config?.__fileDataUrl && excelNode.config?.filePath) {
            file = await fileFromDataUrl(excelNode.config.__fileDataUrl, excelNode.config.filePath);
          }

          if (file) {
            const parsed = await uploadExcel(file, excelNode.config?.sheetName);
            excelData = Array.isArray(parsed) ? parsed : parsed?.rows || parsed?.data || null;

            if (excelData) {
              updateNode(excelNode.id, {
                config: { ...excelNode.config, __rows: excelData, __file: file },
              });
            }
          } else if (Array.isArray(excelNode.config?.__rows)) {
            excelData = excelNode.config.__rows;
          } else {
            throw new Error("Please upload an Excel file in the Excel node properties before executing.");
          }
        }

        const firstRow = Array.isArray(excelData) && excelData.length > 0 ? excelData[0] : null;

        // template
        const templateNode = currentWorkflow.nodes.find((n) => n.subtype === "template");
        let templateMeta: SavedLayout | null = null;
        if (templateNode && templateNode.config?.templateId) {
          const templateId = templateNode.config.templateId;
          const found = savedLayouts.find((l) => (l._id || l.id) === templateId || l.id === templateId);
          templateMeta = found ?? { id: templateId, name: "unknown template" };
        }

        const payload = {
          workflowId: currentWorkflow.id,
          workflowName: currentWorkflow.name,
          template: templateMeta,
          input: inputData ?? firstRow ?? null,
        };

        // PDFs
        const pdfNode = currentWorkflow.nodes.find((n) => n.subtype === "pdf");
        const pdfOutputs: Array<{ type: string; url: string; nodeId: string }> = [];
        const layoutIdForRender = templateMeta ? String(templateMeta._id || templateMeta.id || "") : "";

        if (pdfNode && layoutIdForRender) {
          if (Array.isArray(excelData) && excelData.length > 0) {
            const batch = await renderLayoutPdfBatch(
              layoutIdForRender,
              excelData,
              currentWorkflow.name.replace(/\s+/g, "_").toLowerCase() || "doc"
            );
            const pdfZipUrl = zipDownloadUrl(batch.zip);
            if (pdfZipUrl) {
              pdfOutputs.push({ type: "pdf-zip", url: pdfZipUrl, nodeId: pdfNode.id });
            }
          } else if (payload.input) {
            const file = await renderLayoutPdf(
              layoutIdForRender,
              payload.input,
              `${currentWorkflow.name.replace(/\s+/g, "_").toLowerCase()}-${Date.now()}.pdf`
            );
            const fileUrl = zipDownloadUrl(file.file);
            if (fileUrl) {
              pdfOutputs.push({ type: "pdf", url: fileUrl, nodeId: pdfNode.id });
            }
          }
        }

        // QR
        const qrNode = currentWorkflow.nodes.find((n) => n.subtype === "qrcode");
        let qrResultUrl: string | null = null;

        if (qrNode) {
          if (Array.isArray(excelData) && excelData.length > 0) {
            const batchPayload = { templateId: templateMeta?.id, rows: excelData, encodeAs: "json" as const };
            const batchRes = await batchGenerateQRCodes(batchPayload);
            const results = Array.isArray(batchRes.results) ? batchRes.results : [];
            setBatchResults(results);
            setZipUrl(batchRes.zip ? zipDownloadUrl(batchRes.zip) : null);
            if (results.length > 0) {
              setQrDataUrl(results[0].dataUrl);
              qrResultUrl = results[0].dataUrl;
            }
          } else {
            const text = JSON.stringify(payload);
            const res = await generateQRCode(text, qrNode.config?.size || 256);
            qrResultUrl = res?.dataUrl || res?.qrCode || null;
            setQrDataUrl(qrResultUrl);
          }
        }

        const combinedOutputs: Array<{ nodeId: string; outputType: string; url: string }> = [
          ...pdfOutputs.map((o) => ({ nodeId: o.nodeId, outputType: o.type, url: o.url })),
          ...(qrResultUrl && qrNode ? [{ nodeId: qrNode.id, outputType: "qrcode", url: qrResultUrl }] : []),
        ];

        const execResult: Partial<WorkflowExecution> = {
          workflowId: currentWorkflow.id,
          workflowName: currentWorkflow.name,
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          inputData: payload,
          results: combinedOutputs,
        };

        try {
          await recordWorkflowExecution(execResult);
        } catch (e) {
          console.warn("recordWorkflowExecution failed:", e);
        }

        onExecuteWorkflow(currentWorkflow, execResult);
        return execResult;
      } catch (err) {
        console.error("Workflow execution failed:", err);
        const failedResult: Partial<WorkflowExecution> = {
          workflowId: currentWorkflow.id,
          workflowName: currentWorkflow.name,
          status: "failed",
          startTime: new Date(),
          endTime: new Date(),
          logs: [{ timestamp: new Date(), level: "error", message: (err as Error).message }],
        };

        try {
          await recordWorkflowExecution(failedResult);
        } catch (e) {
          console.warn("recordWorkflowExecution (failed case) error:", e);
        }

        onExecuteWorkflow(currentWorkflow, failedResult);
        throw err;
      }
    },
    [currentWorkflow, savedLayouts, onExecuteWorkflow, updateNode]
  );

  /* ---------- actions with validation ---------- */
  const ensureNameIsValid = () => {
    const nm = (currentWorkflow.name || "").trim();
    if (!nm) {
      alert("Workflow name is required.");
      return false;
    }
    const clash = workflowsList.some((w) => {
      const wid = String(w._id || w.id || "");
      if (wid && wid === currentWorkflow.id) return false;
      return (w.name || "").trim().toLowerCase() === nm.toLowerCase();
    });
    if (clash) {
      alert("A workflow with this name already exists. Please choose another name.");
      return false;
    }
    return true;
  };

  const saveWorkflow = useCallback(async () => {
    if (!ensureNameIsValid()) return;
    try {
      const savedRec = await upsertWorkflow(toWorkflowRecord(currentWorkflow));
      const normalized = fromWorkflowRecord(savedRec, currentWorkflow);
      setCurrentWorkflow(normalized);
      onSaveWorkflow(normalized);
      await fetchWorkflows();
      alert("Workflow saved.");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save workflow: " + (err?.message || String(err)));
    }
  }, [currentWorkflow, onSaveWorkflow, fetchWorkflows]);

  const executeWorkflow = useCallback(
    async (inputData?: any) => {
      setIsExecuteDialogOpen(false);
      if (!ensureNameIsValid()) return;
      try {
        const savedRec = await upsertWorkflow(toWorkflowRecord(currentWorkflow));
        const normalized = fromWorkflowRecord(savedRec, currentWorkflow);
        setCurrentWorkflow(normalized);
        onSaveWorkflow(normalized);
        await runWorkflow(inputData);
        alert("Workflow saved & executed (check results panel / Jobs Dashboard).");
      } catch (err: any) {
        alert("Execution failed: " + (err?.message || "Unknown error"));
      }
    },
    [currentWorkflow, onSaveWorkflow, runWorkflow]
  );

  const handleSendEmailToCustomer = useCallback(async () => {
    if (!emailTo) return alert("Enter customer email address");
    if (!batchResults || batchResults.length === 0) return alert("No QR images to send");

    setIsSendingEmail(true);
    try {
      const attachments = batchResults.map((r, idx) => ({
        filename: `qr-${idx + 1}.png`,
        content: r.dataUrl,
      }));

      await sendEmail({
        to: emailTo,
        subject: `Your ${currentWorkflow.name} QR codes`,
        text: `Attached are ${attachments.length} QR code(s).`,
        attachments,
      });

      alert("Email sent successfully");
    } catch (err: any) {
      console.error("Send email failed", err);
      alert("Failed to send email: " + (err?.message || String(err)));
    } finally {
      setIsSendingEmail(false);
    }
  }, [emailTo, batchResults, currentWorkflow.name]);

  /* ---------- UI ---------- */

  return (
    <div className="flex h-screen bg-background">
      {/* Left Rail */}
      <div className={`${LEFT_WIDTH} bg-card border-r p-4 overflow-auto ${PANEL_FONT}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Saved Workflows</h3>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className={BTN_COMPACT} onClick={fetchWorkflows} title="Refresh">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" className={BTN_COMPACT} onClick={makeNewWorkflow} title="New workflow">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable dropdown for saved workflows */}
        <div className="mb-6">
          <Select
            value={selectedWorkflowId || ""}
            onValueChange={(id) => {
              const rec = workflowsList.find((w) => String(w._id || w.id || "") === id);
              if (rec) loadWorkflowIntoCanvas(rec);
            }}
          >
            <SelectTrigger className="w-full h-8 text-[12px]" aria-label="Saved Workflows">
              <SelectValue placeholder={isLoadingWorkflows ? "Loading..." : "Choose workflow"} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-auto">
              {workflowsList.length === 0 ? (
                <div className="px-3 py-2 text-muted-foreground text-xs">No workflows yet.</div>
              ) : (
                workflowsList.map((wf) => {
                  const id = String(wf._id || wf.id || "");
                  return (
                    <SelectItem key={id} value={id} className="text-[12px]">
                      {wf.name || "(untitled)"}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>

        <h3 className="mb-3 font-semibold">Workflow Nodes</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Input Sources</h4>
            <div className="space-y-1">
              {(nodeTemplates.input as any).map((template: any) => (
                <Button
                  key={template.subtype}
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start ${BTN_COMPACT}`}
                  onClick={() => addNode("input", template.subtype)}
                >
                  <template.icon className="w-4 h-4 mr-2" />
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Processing</h4>
            <div className="space-y-1">
              {(nodeTemplates.processing as any).map((template: any) => (
                <Button
                  key={template.subtype}
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start ${BTN_COMPACT}`}
                  onClick={() => addNode("processing", template.subtype)}
                >
                  <template.icon className="w-4 h-4 mr-2" />
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Output Formats</h4>
            <div className="space-y-1">
              {(nodeTemplates.output as any).map((template: any) => (
                <Button
                  key={template.subtype}
                  variant="outline"
                  size="sm"
                  className={`w-full justify-start ${BTN_COMPACT}`}
                  onClick={() => addNode("output", template.subtype)}
                >
                  <template.icon className="w-4 h-4 mr-2" />
                  {template.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
            <DialogTrigger asChild>
              <Button className={`w-full ${BTN_COMPACT}`} disabled={!!nameError} title={nameError || "Execute current workflow"}>
                <Play className="w-4 h-4 mr-2" />
                Execute Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Execute Workflow</DialogTitle>
                <DialogDescription>Execute the current workflow with optional input data.</DialogDescription>
              </DialogHeader>
              <WorkflowExecuteDialog
                workflow={currentWorkflow}
                onExecute={executeWorkflow}
                onCancel={() => setIsExecuteDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={saveWorkflow}
            className={`w-full ${BTN_COMPACT}`}
            disabled={!!nameError}
            title={nameError || "Save current workflow"}
          >
            Save Workflow
          </Button>

          <Button variant="ghost" onClick={() => fetchSavedLayouts()} className={`w-full ${BTN_COMPACT}`}>
            Refresh Templates
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-3 bg-card">
          <div className={`flex justify-between items-center ${PANEL_FONT}`}>
            <div>
              <h2 className="text-sm">{currentWorkflow.name}</h2>
              <p className="text-muted-foreground text-[11px]">Drag nodes to design your workflow</p>
            </div>
            <Badge variant="secondary" className="text-[10px] py-0.5 px-1">
              {currentWorkflow.nodes.length} nodes, {currentWorkflow.connections.length} connections
            </Badge>
          </div>
        </div>

        <div
          ref={canvasRef}
          className="flex-1 relative bg-gray-50 overflow-auto"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #ddd 1px, transparent 1px), linear-gradient(to bottom, #ddd 1px, transparent 1px)`,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />

          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {currentWorkflow.connections.map((connection) => {
              const sourceNode = currentWorkflow.nodes.find((n) => n.id === connection.sourceNodeId);
              const targetNode = currentWorkflow.nodes.find((n) => n.id === connection.targetNodeId);
              if (!sourceNode || !targetNode) return null;
              const startX = sourceNode.x + sourceNode.width;
              const startY = sourceNode.y + sourceNode.height / 2;
              const endX = targetNode.x;
              const endY = targetNode.y + targetNode.height / 2;
              return <line key={connection.id} x1={startX} y1={startY} x2={endX} y2={endY} stroke="#666" strokeWidth={2} />;
            })}
          </svg>

          {/* Nodes */}
          {currentWorkflow.nodes.map((node) => (
            <WorkflowNodeComponent
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onStartConnection={startConnection}
              onCompleteConnection={completeConnection}
              isConnecting={isConnecting}
            />
          ))}
        </div>
      </div>

      {/* Properties Panel */}
      <div className={`${RIGHT_WIDTH} bg-card border-l p-4 overflow-auto ${PANEL_FONT}`}>
        <h3 className="mb-3 font-semibold">Properties</h3>

        {/* ALWAYS VISIBLE — Workflow details (name + description) */}
        <div className="mb-4 p-3 rounded border bg-muted/40">
          <Label className={LABEL_SM}>
            Workflow Name <span className="text-red-600">*</span>
          </Label>
          <Input
            className="h-8 text-[12px] mt-1"
            value={currentWorkflow.name}
            onChange={(e) =>
              setCurrentWorkflow((prev) => ({ ...prev, name: e.target.value, updatedAt: new Date() }))
            }
            placeholder="e.g., Customer Data Processing"
          />
          {nameError ? <div className="text-[11px] text-red-600 mt-1">{nameError}</div> : null}

          <div className="mt-3">
            <Label className={LABEL_SM}>Description</Label>
            <Textarea
              className="text-[12px] mt-1"
              value={currentWorkflow.description}
              onChange={(e) =>
                setCurrentWorkflow((prev) => ({ ...prev, description: e.target.value, updatedAt: new Date() }))
              }
              placeholder="Describe your workflow..."
              rows={3}
            />
          </div>
        </div>

        {/* Node properties or info */}
        {selectedNodeData ? (
          <NodePropertiesPanel
            node={selectedNodeData}
            layouts={[...savedLayouts]
              .sort((a: any, b: any) => {
                const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
                const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
                return tb - ta; // latest first
              })
              .map((l, idx) => ({
                id: String(l._id ?? l.id ?? `tpl-${idx}`),
                name: l.name,
                zones: Array.isArray(l.structure?.zones) ? (l.structure.zones as LayoutZone[]) : [],
              }))}

            // ✅ these were missing:
            onUpdateNode={(updates) => updateNode(selectedNodeData.id, updates)}
            onDeleteNode={() => deleteNode(selectedNodeData.id)}
          />
        ) : (
          <div className="text-muted-foreground text-[12px]">
            Select a node to edit its properties.
          </div>
        )}

        {/* Batch results / preview section stays below */}
        {batchResults && batchResults.length > 0 ? (
          <div className="mt-4">
            <Label className={LABEL_SM}>Generated QRs ({batchResults.length})</Label>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {batchResults.map((r, i) => (
                <div key={i} className="p-2 border rounded">
                  <img src={r.dataUrl} alt={`qr-${i}`} className="w-full" />
                  <div className="text-[11px] mt-1 truncate">{r.textEncoded}</div>
                  <div className="flex items-center justify-between mt-2">
                    <button className="text-[12px] underline" onClick={() => downloadDataUrl(r.dataUrl, `qr-${i + 1}.png`)}>
                      Download
                    </button>
                    <span className="text-[11px] text-muted-foreground">#{r.rowIndex + 1}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              {zipUrl ? (
                <a href={zipUrl} target="_blank" rel="noreferrer">
                  <Button className={BTN_COMPACT}>
                    <Download className="w-4 h-4 mr-2" />
                    Download all (zip)
                  </Button>
                </a>
              ) : (
                <Button disabled className={BTN_COMPACT}>
                  <Download className="w-4 h-4 mr-2" />
                  Preparing zip...
                </Button>
              )}
            </div>

            <div className="mt-3">
              <Label className={LABEL_SM}>Send to customer (email)</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input className="h-8 text-[12px]" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="customer@example.com" />
                <Button onClick={handleSendEmailToCustomer} disabled={isSendingEmail} className={BTN_COMPACT}>
                  {isSendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">Emails are sent using your SMTP settings on the backend.</div>
            </div>
          </div>
        ) : (
          qrDataUrl && (
            <div className="mt-4">
              <Label className={LABEL_SM}>Last QR Output</Label>
              <div className="mt-2">
                <img src={qrDataUrl} alt="QR Result" className="w-full border" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ---------- Node UI components (with port stopPropagation) ---------- */

function WorkflowNodeComponent({
  node,
  isSelected,
  onMouseDown,
  onStartConnection,
  onCompleteConnection,
  isConnecting,
}: {
  node: WorkflowNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onStartConnection: (nodeId: string, outputId: string) => void;
  onCompleteConnection: (nodeId: string, inputId: string) => void;
  isConnecting: boolean;
}) {
  const getNodeColor = (type: string) => {
    switch (type) {
      case "input":
        return "bg-blue-100 border-blue-300";
      case "processing":
        return "bg-green-100 border-green-300";
      case "output":
        return "bg-orange-100 border-orange-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const Port = ({ onDown, title }: { onDown: (e: React.MouseEvent) => void; title?: string }) => (
    <div
      title={title}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onDown(e);
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-3 h-3 rounded-full flex items-center justify-center"
      style={{ userSelect: "none" }}
    >
      <div className="w-2 h-2 rounded-full bg-gray-400" />
    </div>
  );

  return (
    <div
      className={`absolute border-2 rounded-lg cursor-move shadow-sm ${isSelected ? "border-primary shadow-lg" : getNodeColor(node.type)}`}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
      onMouseDown={onMouseDown}
    >
      <div className="p-2 h-full flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-[12px] truncate">{node.label}</h4>
          <Badge variant="outline" className="text-[10px] py-0 px-1">
            {node.type}
          </Badge>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          {/* Input ports (left) */}
          <div className="space-y-0.5">
            {node.inputs.map((input) => (
              <div key={input.id} className="flex items-center">
                <div className="mr-1.5">
                  <Port
                    title={`Connect to ${input.label}`}
                    onDown={() => {
                      if (isConnecting) onCompleteConnection(node.id, input.id);
                    }}
                  />
                </div>
                <span className="text-[11px] text-gray-600">{input.label}</span>
              </div>
            ))}
          </div>

          {/* Output ports (right) */}
          <div className="space-y-0.5 self-end">
            {node.outputs.map((output) => (
              <div key={output.id} className="flex items-center justify-end cursor-pointer">
                <span className="text-[11px] text-gray-600 mr-1.5">{output.label}</span>
                <div>
                  <Port title={`Start connection from ${output.label}`} onDown={() => onStartConnection(node.id, output.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NodePropertiesPanel({
  node,
  layouts,
  onUpdateNode,
  onDeleteNode,
}: {
  node: WorkflowNode;
  layouts: Array<{ id: string; name: string; zones: LayoutZone[] }>;
  onUpdateNode: (updates: Partial<WorkflowNode>) => void;
  onDeleteNode: () => void;
}) {
  const updateConfig = (key: string, value: any) => {
    onUpdateNode({ config: { ...node.config, [key]: value } });
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      onUpdateNode({ config: { ...(node.config || {}), __file: null, __fileDataUrl: null, __rows: null, filePath: "" } });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateNode({
        config: {
          ...(node.config || {}),
          __file: file,
          __fileDataUrl: reader.result,
          __rows: null,
          filePath: file.name,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const renderConfigFields = () => {
    switch (node.subtype) {
      case "excel":
        return (
          <div className="space-y-2">
            <div>
              <Label className={LABEL_SM}>Upload Excel</Label>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="w-full text-[12px]"
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                {node.config.filePath ? `Selected: ${node.config.filePath}` : "No file selected"}
                {Array.isArray(node.config?.__rows) ? ` • Parsed rows: ${node.config.__rows.length}` : ""}
              </div>
            </div>
            <div>
              <Label className={LABEL_SM}>Sheet Name</Label>
              <Input className="h-8 text-[12px]" value={node.config.sheetName || "Sheet1"} onChange={(e) => updateConfig("sheetName", e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={node.config.hasHeaders || false}
                onChange={(e) => updateConfig("hasHeaders", e.target.checked)}
              />
              <Label className={LABEL_SM}>Has Headers</Label>
            </div>
          </div>
        );

      case "api":
        return (
          <div className="space-y-2">
            <div>
              <Label className={LABEL_SM}>URL</Label>
              <Input className="h-8 text-[12px]" value={node.config.url || ""} onChange={(e) => updateConfig("url", e.target.value)} placeholder="https://api.example.com/data" />
            </div>
            <div>
              <Label className={LABEL_SM}>Method</Label>
              <Select value={node.config.method || "GET"} onValueChange={(v) => updateConfig("method", v)}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "template":
        return (
          <div className="space-y-2">
            <div>
              <Label className={LABEL_SM}>Layout Template</Label>
              <Select
                value={node.config.templateId}
                onValueChange={(v) => updateConfig("templateId", v)}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                {/* Use popper so it's not clipped by right panel; give it a max height + scroll + high z-index */}
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="max-h-72 overflow-auto z-[1000]"
                >
                  {layouts.length === 0 ? (
                    <div className="px-3 py-2 text-muted-foreground text-xs">No templates found.</div>
                  ) : (
                    layouts.map((l) => (
                      <SelectItem key={l.id} value={l.id} className="text-[12px]">
                        {l.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        );


      case "qrcode":
        return (
          <div className="space-y-2">
            <div>
              <Label className={LABEL_SM}>Size</Label>
              <Input className="h-8 text-[12px]" value={node.config.size || 256} onChange={(e) => updateConfig("size", parseInt(e.target.value || "256"))} />
            </div>
            <div>
              <Label className={LABEL_SM}>Error Correction</Label>
              <Select value={node.config.errorCorrection || "M"} onValueChange={(v) => updateConfig("errorCorrection", v)}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="Q">Q</SelectItem>
                  <SelectItem value="H">H</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground text-[12px]">No configuration available for this node type.</p>;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className={LABEL_SM}>Node Label</Label>
        <Input className="h-8 text-[12px]" value={node.label} onChange={(e) => onUpdateNode({ label: e.target.value })} />
      </div>

      <div>
        <Label className={LABEL_SM}>Node Type</Label>
        <Badge variant="secondary" className="text-[10px] py-0 px-1">
          {node.type} - {node.subtype}
        </Badge>
      </div>

      <div>
        <Label className={LABEL_SM}>Configuration</Label>
        {renderConfigFields()}
      </div>

      <div className="pt-3 border-t">
        <Button variant="destructive" onClick={onDeleteNode} className={`w-full ${BTN_COMPACT}`}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
}

function WorkflowExecuteDialog({
  workflow,
  onExecute,
  onCancel,
}: {
  workflow: Workflow;
  onExecute: (inputData?: any) => void;
  onCancel: () => void;
}) {
  const [inputData, setInputData] = useState<string>("{}");

  const handleExecute = () => {
    try {
      const json = JSON.parse(inputData);
      onExecute(json);
    } catch {
      onExecute();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px]">Workflow Summary</Label>
        <div className="mt-2 p-3 bg-muted rounded text-xs">
          <p>
            <strong>Name:</strong> {workflow.name}
          </p>
          <p>
            <strong>Nodes:</strong> {workflow.nodes.length}
          </p>
          <p>
            <strong>Connections:</strong> {workflow.connections.length}
          </p>
        </div>
      </div>

      <div>
        <Label className="text-[11px]">Input Data (JSON)</Label>
        <Textarea value={inputData} onChange={(e) => setInputData(e.target.value)} placeholder='{"key":"value"}' rows={6} className="text-[12px]" />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleExecute} className={`flex-1 ${BTN_COMPACT}`}>
          <Play className="w-4 h-4 mr-2" />
          Execute
        </Button>
        <Button variant="outline" onClick={onCancel} className={`flex-1 ${BTN_COMPACT}`}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
