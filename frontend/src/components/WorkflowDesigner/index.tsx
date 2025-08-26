// src/components/WorkflowDesigner/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Play, RotateCcw, Plus, Download } from "lucide-react";

import { LayoutZone } from "../LayoutDesigner";
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
} from "../../api";
import type { WorkflowRecord } from "../../api";

import WorkflowNodeComponent from "./WorkflowNodeComponent";
import NodePropertiesPanel from "./NodePropertiesPanel";
import {
  PANEL_FONT,
  LEFT_WIDTH,
  RIGHT_WIDTH,
  GRID_SIZE,
  NODE_DEFAULT,
  BTN_COMPACT,
  LABEL_SM,
  Workflow,
  WorkflowNode,
  WorkflowExecution,
  WorkflowConnection,
  SavedLayout,
} from "./types";
// import only what's present
import { joinPayslipSheets } from "./helpers";

// smaller: node templates + execute dialog split out
import { NODE_TEMPLATES as nodeTemplates } from "./nodeTemplates";
import WorkflowExecuteDialog from "./ExecuteDialog";

/** Fallback: convert a dataURL to a File (helpers.ts may not export this) */
async function fileFromDataUrl(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}

/* -------------------------------- component ------------------------------- */

export function WorkflowDesigner({
  layouts: initialLayouts = [],
  onExecuteWorkflow,
  onSaveWorkflow,
}: {
  layouts?: SavedLayout[];
  onExecuteWorkflow: (workflow: Workflow, inputData?: any) => void;
  onSaveWorkflow: (workflow: Workflow) => void;
}) {
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
  const [workflowsList, setWorkflowsList] = useState<WorkflowRecord[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const selectedWorkflowId = String(currentWorkflow.id || "");

  const nameError = useMemo(() => {
    const nm = (currentWorkflow.name || "").trim();
    if (!nm) return "Workflow name is required.";
    const clash = workflowsList.some((w) => {
      const wid = String((w as any)._id || (w as any).id || "");
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

  /* ------------------------------ node helpers ----------------------------- */
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

    setCurrentWorkflow((prev) => ({ ...prev, nodes: [...prev.nodes, newNode], updatedAt: new Date() }));
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
      connections: prev.connections.filter((c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId),
      updatedAt: new Date(),
    }));
    setSelectedNode(null);
  }, []);

  /* ----------------------- dragging / connection wiring -------------------- */
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      setSelectedNode(nodeId);
      setIsDragging(true);

      const node = currentWorkflow.nodes.find((n) => n.id === nodeId);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!node || !rect) return;

      setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
    },
    [currentWorkflow.nodes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedNode) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      updateNode(selectedNode, {
        x: Math.max(0, e.clientX - rect.left - dragOffset.x),
        y: Math.max(0, e.clientY - rect.top - dragOffset.y),
      });
    },
    [isDragging, selectedNode, dragOffset, updateNode]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

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

  /* --------------------------------- data IO -------------------------------- */
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

  const toWorkflowRecord = (wf: Workflow): WorkflowRecord => ({
    id: wf.id || undefined,
    name: wf.name,
    description: wf.description,
    nodes: wf.nodes.map((n) => ({
      ...n,
      config: (n.config as any)?.__file ? { ...(n.config as any), __file: undefined } : n.config,
    })),
    connections: wf.connections,
    createdAt: (wf as any).createdAt?.toISOString?.() ?? (wf as any).createdAt,
    updatedAt: new Date().toISOString(),
    isActive: wf.isActive,
    tags: wf.tags,
  });

  const fromWorkflowRecord = (rec: WorkflowRecord, fallback?: Workflow): Workflow => {
    const base: Workflow =
      fallback ?? ({ id: "", name: "New Workflow", description: "", nodes: [], connections: [], createdAt: new Date(), updatedAt: new Date(), isActive: true, tags: [] } as Workflow);

    return {
      ...base,
      id: String((rec as any)._id || (rec as any).id || base.id),
      name: (rec as any).name ?? base.name,
      description: (rec as any).description ?? base.description,
      nodes: (rec as any).nodes ?? base.nodes,
      connections: (rec as any).connections ?? base.connections,
      createdAt: (rec as any).createdAt ? new Date((rec as any).createdAt) : base.createdAt,
      updatedAt: (rec as any).updatedAt ? new Date((rec as any).updatedAt) : new Date(),
      isActive: (rec as any).isActive ?? base.isActive,
      tags: (rec as any).tags ?? base.tags,
    };
  };

  const loadWorkflowIntoCanvas = useCallback(
    (rec: WorkflowRecord) => {
      const normalized = fromWorkflowRecord(rec, currentWorkflow);
      setCurrentWorkflow((prev) => ({
        ...normalized,
        nodes: normalized.nodes.map((n: any) => {
          const prevMatch = (prev.nodes as any).find((p: any) => p.id === n.id);
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

  // ESC cancels connection
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

  /* ------------------------------- execution ------------------------------- */
  const runWorkflow = useCallback(
    async (inputData?: any) => {
      try {
        setBatchResults([]);
        setZipUrl(null);
        setQrDataUrl(null);

        // Excel → rowsForRender (supports Payslip,Earnings,Deductions)
        const excelNodes = currentWorkflow.nodes.filter((n) => n.subtype === "excel");
        let rowsForRender: any[] | null = null;

        if (excelNodes.length) {
          const excelNode = excelNodes[0];

          let file: File | null = (excelNode.config as any)?.__file || null;
          if (!file && (excelNode.config as any)?.__fileDataUrl && (excelNode.config as any)?.filePath) {
            file = await fileFromDataUrl((excelNode.config as any).__fileDataUrl, (excelNode.config as any).filePath);
          }
          if (!file) throw new Error("Please upload an Excel file in the Excel node.");

          const raw = String((excelNode.config as any)?.sheetName || "Sheet1").trim();
          const names = raw.includes(",") ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [raw];

          if (names.length > 1) {
            const sheets: Record<string, any[]> = {};
            for (const nm of names) {
              const parsed = await uploadExcel(file, nm);
              sheets[nm] = Array.isArray(parsed) ? parsed : (parsed as any)?.rows || (parsed as any)?.data || [];
            }
            const tpl = currentWorkflow.nodes.find((n) => n.subtype === "template");
            const logo = (tpl as any)?.config?.companyLogoDataUrl || (tpl as any)?.config?.companyLogoUrl || null;
            rowsForRender = joinPayslipSheets(sheets, logo);
          } else {
            const parsed = await uploadExcel(file, names[0]);
            rowsForRender = Array.isArray(parsed) ? parsed : (parsed as any)?.rows || (parsed as any)?.data || null;
          }

          if (rowsForRender) {
            updateNode(excelNode.id, { config: { ...(excelNode.config as any), __rows: rowsForRender, __file: file } as any });
          }
        }

        // ---- Defensive normalization (logo + table arrays) ----
        const tplNode = currentWorkflow.nodes.find((n) => n.subtype === "template");
        const logoFromTpl = (tplNode as any)?.config?.companyLogoDataUrl || (tplNode as any)?.config?.companyLogoUrl || null;
        const normalizeRow = (row: any) => {
          const earnings =
            Array.isArray(row?.Earnings)
              ? row.Earnings
              : Array.isArray(row?.earningsTable?.data)
              ? row.earningsTable.data.map(([c, a]: any[]) => ({ component: String(c ?? ""), amount: Number(a ?? 0) }))
              : [];
          const deductions =
            Array.isArray(row?.Deductions)
              ? row.Deductions
              : Array.isArray(row?.deductionsTable?.data)
              ? row.deductionsTable.data.map(([c, a]: any[]) => ({ component: String(c ?? ""), amount: Number(a ?? 0) }))
              : [];
          return {
            ...row,
            companyLogo: row?.companyLogo ?? row?.CompanyLogo ?? logoFromTpl ?? null,
            CompanyLogo: row?.CompanyLogo ?? row?.companyLogo ?? logoFromTpl ?? null,
            Earnings: earnings.map((r: any) => ({
              component: String(r.component ?? r.Component ?? ""),
              amount: Number(r.amount ?? r.Amount ?? 0),
            })),
            Deductions: deductions.map((r: any) => ({
              component: String(r.component ?? r.Component ?? ""),
              amount: Number(r.amount ?? r.Amount ?? 0),
            })),
          };
        };

        rowsForRender = Array.isArray(rowsForRender) ? rowsForRender.map(normalizeRow) : null;
        const firstRow = rowsForRender?.[0] ?? null;
        const singleInput = inputData ? normalizeRow(inputData) : firstRow;

        // template meta
        const templateNode = currentWorkflow.nodes.find((n) => n.subtype === "template");
        let templateMeta: SavedLayout | null = null;
        if (templateNode && (templateNode.config as any)?.templateId) {
          const templateId = (templateNode.config as any).templateId;
          const found = savedLayouts.find((l) => ((l as any)._id || (l as any).id) === templateId || (l as any).id === templateId);
          templateMeta = found ?? ({ id: templateId, name: "unknown template" } as any);
        }

        const layoutIdForRender = templateMeta ? String((templateMeta as any)._id || (templateMeta as any).id || "") : "";

        // PDFs
        const pdfNode = currentWorkflow.nodes.find((n) => n.subtype === "pdf");
        const pdfOutputs: Array<{ type: string; url: string; nodeId: string }> = [];

        if (pdfNode && layoutIdForRender) {
          if (rowsForRender?.length) {
            const batch = await renderLayoutPdfBatch(
              layoutIdForRender,
              rowsForRender,
              currentWorkflow.name.replace(/\s+/g, "_").toLowerCase() || "doc"
            );
            const pdfZipUrl = zipDownloadUrl((batch as any).zip);
            if (pdfZipUrl) pdfOutputs.push({ type: "pdf-zip", url: pdfZipUrl, nodeId: pdfNode.id });
          } else if (singleInput) {
            const file = await renderLayoutPdf(
              layoutIdForRender,
              singleInput,
              `${currentWorkflow.name.replace(/\s+/g, "_").toLowerCase()}-${Date.now()}.pdf`
            );
            const fileUrl = zipDownloadUrl((file as any).file);
            if (fileUrl) pdfOutputs.push({ type: "pdf", url: fileUrl, nodeId: pdfNode.id });
          }
        }

        // QR
        const qrNode = currentWorkflow.nodes.find((n) => n.subtype === "qrcode");
        let qrResultUrl: string | null = null;

        if (qrNode) {
          if (rowsForRender?.length) {
            const batchPayload = { templateId: (templateMeta as any)?.id, rows: rowsForRender, encodeAs: "json" as const };
            const batchRes = await batchGenerateQRCodes(batchPayload as any);
            const results = Array.isArray((batchRes as any).results) ? (batchRes as any).results : [];
            setBatchResults(results);
            setZipUrl((batchRes as any).zip ? zipDownloadUrl((batchRes as any).zip) : null);
            if (results.length > 0) {
              setQrDataUrl(results[0].dataUrl);
              qrResultUrl = results[0].dataUrl;
            }
          } else if (singleInput) {
            const text = JSON.stringify({
              workflowId: currentWorkflow.id,
              workflowName: currentWorkflow.name,
              template: templateMeta,
              input: singleInput,
            });
            const res = await generateQRCode(text, (qrNode.config as any)?.size || 256);
            qrResultUrl = (res as any)?.dataUrl || (res as any)?.qrCode || null;
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
          inputData: {
            workflowId: currentWorkflow.id,
            workflowName: currentWorkflow.name,
            template: templateMeta,
            input: singleInput ?? null,
          },
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

  /* ---------------------------- save / execute UI --------------------------- */
  const ensureNameIsValid = () => {
    const nm = (currentWorkflow.name || "").trim();
    if (!nm) return alert("Workflow name is required."), false;
    const clash = workflowsList.some((w) => {
      const wid = String((w as any)._id || (w as any).id || "");
      if (wid && wid === currentWorkflow.id) return false;
      return (w.name || "").trim().toLowerCase() === nm.toLowerCase();
    });
    if (clash) return alert("A workflow with this name already exists. Please choose another name."), false;
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
    if (!batchResults?.length) return alert("No QR images to send");
    setIsSendingEmail(true);
    try {
      const attachments = batchResults.map((r, idx) => ({ filename: `qr-${idx + 1}.png`, content: r.dataUrl }));
      await sendEmail({ to: emailTo, subject: `Your ${currentWorkflow.name} QR codes`, text: `Attached are ${attachments.length} QR code(s).`, attachments });
      alert("Email sent successfully");
    } catch (err: any) {
      console.error("Send email failed", err);
      alert("Failed to send email: " + (err?.message || String(err)));
    } finally {
      setIsSendingEmail(false);
    }
  }, [emailTo, batchResults, currentWorkflow.name]);

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="flex h-screen bg-background">
      {/* Left rail */}
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

        {/* Saved workflows dropdown */}
        <div className="mb-6">
          <Select
            value={selectedWorkflowId || ""}
            onValueChange={(id) => {
              const rec = workflowsList.find((w) => String((w as any)._id || (w as any).id || "") === id);
              if (rec) loadWorkflowIntoCanvas(rec);
            }}
          >
            <SelectTrigger className="w-full h-8 text-[12px] text-foreground" aria-label="Saved Workflows">
              <SelectValue placeholder={isLoadingWorkflows ? "Loading..." : "Choose workflow"} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-auto">
              {workflowsList.length === 0 ? (
                <div className="px-3 py-2 text-muted-foreground text-xs">No workflows yet.</div>
              ) : (
                workflowsList.map((wf) => {
                  const id = String((wf as any)._id || (wf as any).id || "");
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
          {(["input", "processing", "output"] as const).map((group) => (
            <div key={group}>
              <h4 className="font-medium mb-2">
                {group === "input" ? "Input Sources" : group === "processing" ? "Processing" : "Output Formats"}
              </h4>
              <div className="space-y-1">
                {(nodeTemplates as any)[group].map((template: any) => (
                  <Button
                    key={template.subtype}
                    variant="outline"
                    size="sm"
                    className={`w-full justify-start ${BTN_COMPACT}`}
                    onClick={() => addNode(group, template.subtype)}
                  >
                    <template.icon className="w-4 h-4 mr-2" />
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
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
              <WorkflowExecuteDialog workflow={currentWorkflow} onExecute={executeWorkflow} onCancel={() => setIsExecuteDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={saveWorkflow} className={`w-full ${BTN_COMPACT}`} disabled={!!nameError} title={nameError || "Save current workflow"}>
            Save Workflow
          </Button>

          <Button variant="ghost" onClick={fetchSavedLayouts} className={`w-full ${BTN_COMPACT}`}>
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
          {/* grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `linear-gradient(to right, #ddd 1px, transparent 1px), linear-gradient(to bottom, #ddd 1px, transparent 1px)`, backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px` }}
          />

          {/* connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {currentWorkflow.connections.map((c) => {
              const s = currentWorkflow.nodes.find((n) => n.id === c.sourceNodeId);
              const t = currentWorkflow.nodes.find((n) => n.id === c.targetNodeId);
              if (!s || !t) return null;
              const startX = s.x + s.width;
              const startY = s.y + s.height / 2;
              const endX = t.x;
              const endY = t.y + t.height / 2;
              return <line key={c.id} x1={startX} y1={startY} x2={endX} y2={endY} stroke="#666" strokeWidth={2} />;
            })}
          </svg>

          {/* nodes */}
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

      {/* Right pane */}
      <div className={`${RIGHT_WIDTH} bg-card border-l p-4 overflow-auto ${PANEL_FONT}`}>
        <h3 className="mb-3 font-semibold">Properties</h3>

        {/* workflow details */}
        <div className="mb-4 p-3 rounded border bg-muted/40">
          <Label className={LABEL_SM}>
            Workflow Name <span className="text-red-600">*</span>
          </Label>
          <Input className="h-8 text-[12px]" value={currentWorkflow.name} onChange={(e) => setCurrentWorkflow((p) => ({ ...p, name: e.target.value, updatedAt: new Date() }))} placeholder="e.g., Payslip 1" />
          {nameError ? <div className="text-[11px] text-red-600 mt-1">{nameError}</div> : null}

          <div className="mt-3">
            <Label className={LABEL_SM}>Description</Label>
            <Textarea className="text-[12px] mt-1" value={currentWorkflow.description} onChange={(e) => setCurrentWorkflow((p) => ({ ...p, description: e.target.value, updatedAt: new Date() }))} placeholder="Describe your workflow..." rows={3} />
          </div>
        </div>

        {/* node props */}
        {selectedNodeData ? (
          <NodePropertiesPanel
            node={selectedNodeData}
            layouts={[...savedLayouts]
              .sort((a: any, b: any) => {
                const ta = new Date((a as any)?.updatedAt || (a as any)?.createdAt || 0).getTime();
                const tb = new Date((b as any)?.updatedAt || (b as any)?.createdAt || 0).getTime();
                return tb - ta;
              })
              .map((l, idx) => ({
                id: String((l as any)._id ?? (l as any).id ?? `tpl-${idx}`),
                name: l.name,
                zones: Array.isArray((l as any).structure?.zones) ? (((l as any).structure.zones as unknown) as LayoutZone[]) : [],
              }))}
            onUpdateNode={(updates) => updateNode(selectedNodeData.id, updates)}
            onDeleteNode={() => deleteNode(selectedNodeData.id)}
          />
        ) : (
          <div className="text-muted-foreground text-[12px]">Select a node to edit its properties.</div>
        )}

        {/* batch results / preview */}
        {batchResults?.length ? (
          <div className="mt-4">
            <Label className={LABEL_SM}>Generated QRs ({batchResults.length})</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {batchResults.map((r, i) => (
                <div key={i} className="p-2 border rounded">
                  <img src={r.dataUrl} alt={`qr-${i}`} className="w-full" />
                  <div className="text-[11px] mt-1 truncate">{r.textEncoded}</div>
                  <div className="flex items-center justify-between mt-2">
                    <button className="text-[12px] underline" onClick={() => downloadDataUrl(r.dataUrl, `qr-${i + 1}.png`)}>Download</button>
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

export type { Workflow as _Workflow, WorkflowExecution as _WorkflowExecution } from "./types";
export default WorkflowDesigner;
