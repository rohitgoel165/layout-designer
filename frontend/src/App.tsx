// src/App.tsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { toast } from "sonner";

import LayoutDesigner from "./components/LayoutDesigner";
import type { LayoutZone } from "./components/LayoutDesigner";
import PRESET_TEMPLATES from "./templates/presets";
// Normalize template names to avoid odd dash glyphs showing as replacement chars
const normalizeName = (s: string) =>
  String(s)
    .normalize("NFKC")
    // replace dash-like unicode with a plain hyphen
    .replace(/[\u2012-\u2015\u2212]/g, "-");

// ✅ Import only the component here
import JobsDashboard from "./components/JobsDashboard";

// ✅ Import shared types here (not from JobsDashboard)
import type { Job, LogEntry } from "./types";

import { VersionControl, LayoutVersion } from "./components/VersionControl";
import { Migration, MigrationTransaction } from "./components/Migration";
import WorkflowDesigner from "./components/WorkflowDesigner";
import type { Workflow, WorkflowExecution } from "./components/WorkflowDesigner/types";

import { Layout, Briefcase, GitBranch, ArrowRightLeft, Workflow as WorkflowIcon } from "lucide-react";
import { listExecutions } from "./api";
import type { WorkflowExecutionRecord } from "./api";
console.log("PRESETS:", PRESET_TEMPLATES.map(p => p.id));

// NEW: include JSON as a supported export format to match LayoutDesigner
export type ExportFormat = "pdf" | "html" | "png" | "tiff" | "json";

export default function App() {
  const [zones, setZones] = useState<LayoutZone[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [versions, setVersions] = useState<LayoutVersion[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentVersion, setCurrentVersion] = useState<LayoutVersion | null>(null);
  const [activeTab, setActiveTab] = useState("designer");

  // Initialize with sample data
  useEffect(() => {
    const sampleJobs: Job[] = [
      {
        id: "job-001",
        layoutId: "layout-001",
        layoutName: "Marketing Flyer",
        type: "export",
        format: "pdf",
        status: "completed",
        progress: 100,
        createdAt: new Date(Date.now() - 3600000),
        completedAt: new Date(Date.now() - 3500000),
        requestData: { zones: [], format: "pdf" },
        responseData: { downloadUrl: "https://example.com/export.pdf" },
        logs: [
          { id: "log-001", timestamp: new Date(Date.now() - 3600000), level: "info", message: "Export job started" },
          { id: "log-002", timestamp: new Date(Date.now() - 3500000), level: "info", message: "PDF generation completed" },
        ],
      },
      {
        id: "job-002",
        layoutId: "layout-002",
        layoutName: "Product Catalog",
        type: "export",
        format: "html",
        status: "processing",
        progress: 65,
        createdAt: new Date(Date.now() - 1800000),
        requestData: { zones: [], format: "html" },
        logs: [
          { id: "log-003", timestamp: new Date(Date.now() - 1800000), level: "info", message: "HTML export started" },
          { id: "log-004", timestamp: new Date(Date.now() - 1200000), level: "info", message: "Processing dynamic content variables" },
        ],
      },
      {
        id: "job-003",
        layoutId: "layout-003",
        layoutName: "Report Template",
        type: "export",
        format: "png",
        status: "failed",
        progress: 0,
        createdAt: new Date(Date.now() - 900000),
        requestData: { zones: [], format: "png" },
        errorMessage: "Invalid image dimensions specified",
        logs: [
          { id: "log-005", timestamp: new Date(Date.now() - 900000), level: "info", message: "PNG export started" },
          { id: "log-006", timestamp: new Date(Date.now() - 800000), level: "error", message: "Export failed: Invalid image dimensions" },
        ],
      },
      {
        id: "job-004",
        layoutId: "migration-001",
        layoutName: "Email Campaign Migration",
        type: "migration",
        status: "completed",
        progress: 100,
        createdAt: new Date(Date.now() - 7200000),
        completedAt: new Date(Date.now() - 6000000),
        // ✅ these fields exist on Job in your shared types
        sourcePlatform: "Mailchimp",
        targetPlatform: "HubSpot",
        totalItems: 25,
        processedItems: 23,
        failedItems: 2,
        requestData: { templates: ["template-001"], settings: { preserveFormatting: true, convertImages: true } },
        responseData: { successful: 23, failed: 2, migrationUrl: "https://example.com/migration-001" },
        logs: [
          { id: "log-007", timestamp: new Date(Date.now() - 7200000), level: "info", message: "Migration from Mailchimp to HubSpot started" },
          { id: "log-008", timestamp: new Date(Date.now() - 6800000), level: "info", message: "Processing 25 email templates" },
          { id: "log-009", timestamp: new Date(Date.now() - 6000000), level: "info", message: "Migration completed: 23 successful, 2 failed" },
        ],
      },
      {
        id: "job-005",
        layoutId: "workflow-001",
        layoutName: "Customer Data Processing Workflow",
        type: "workflow",
        status: "completed",
        progress: 100,
        createdAt: new Date(Date.now() - 5400000),
        completedAt: new Date(Date.now() - 4800000),
        workflowId: "workflow-001",
        workflowNodes: 5,
        executedNodes: 5,
        requestData: { workflow: { name: "Customer Data Processing", nodes: 5 }, inputData: { customers: 100 } },
        responseData: {
          outputs: [
            { type: "pdf", url: "https://example.com/customer-reports.pdf" },
            // ✅ JobOutput in shared types should allow 'endpoint?'
            { type: "api", endpoint: "https://api.example.com/processed-data" },
          ],
        },
        logs: [
          { id: "log-010", timestamp: new Date(Date.now() - 5400000), level: "info", message: "Workflow execution started" },
          { id: "log-011", timestamp: new Date(Date.now() - 5200000), level: "info", message: "Processing CSV input with 100 customer records" },
          { id: "log-012", timestamp: new Date(Date.now() - 5000000), level: "info", message: "Applied layout template processing" },
          { id: "log-013", timestamp: new Date(Date.now() - 4800000), level: "info", message: "Generated PDF output and sent to headless API" },
        ],
      },
    ];

    const sampleVersions: LayoutVersion[] = [
      {
        id: "version-001",
        layoutId: "layout-001",
        version: "v1.0",
        name: "Initial Layout",
        description: "First version of the marketing flyer layout",
        zones: [],
        createdAt: new Date(Date.now() - 86400000),
        createdBy: "John Doe",
        isActive: false,
        tags: ["initial", "marketing"],
        changeLog: ["Initial version created"],
      },
      {
        id: "version-002",
        layoutId: "layout-001",
        version: "v1.1",
        name: "Updated Header",
        description: "Updated header section with new branding",
        zones: [],
        createdAt: new Date(Date.now() - 43200000),
        createdBy: "Jane Smith",
        isActive: false,
        tags: ["branding", "header-update"],
        changeLog: ["Updated header section", "Added company logo"],
      },
      {
        id: "version-003",
        layoutId: "layout-001",
        version: "v2.0",
        name: "Major Redesign",
        description: "Complete layout redesign with new color scheme",
        zones: [],
        createdAt: new Date(Date.now() - 21600000),
        createdBy: "Bob Johnson",
        isActive: true,
        tags: ["redesign", "major-update", "color-scheme"],
        changeLog: ["Complete layout redesign", "New color scheme", "Updated typography"],
      },
    ];

    const sampleWorkflows: Workflow[] = [
      {
        id: "workflow-001",
        name: "Customer Data Processing",
        description: "Process customer data from CSV and generate personalized reports",
        nodes: [],
        connections: [],
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        isActive: true,
        tags: ["customer", "reports", "automation"],
      },
    ];

    // setJobs(sampleJobs); // disabled: load real executions instead
    setVersions(sampleVersions);
    setWorkflows(sampleWorkflows);
    setCurrentVersion(sampleVersions.find((v) => v.isActive) || sampleVersions[0]);
  }, []);

  // Map backend execution record to JobsDashboard Job
  const toJob = (rec: any): Job => {
    const rawId = rec.jobId ?? rec.id ?? rec._id ?? Date.now();
    const id = (/^\d+$/.test(String(rawId)) ? `exec-${rawId}` : String(rawId));
    const outputs = Array.isArray(rec.results)
      ? rec.results.map((r: any) => ({ type: r.outputType || r.type, url: r.url || r.data, data: r.data }))
       : Array.isArray(rec.responseData?.outputs) ? (rec.responseData.outputs as any[]).map((r:any)=>({ type: r.outputType || r.type, url: r.url || r.data, data: r.data }))
      : [];
    const logs = Array.isArray(rec.logs)
      ? rec.logs.map((l: any, i: number) => ({
          id: String(l.id ?? `${id}-log-${i}`),
          timestamp: l.timestamp || new Date(),
          level: l.level || "info",
          message: l.message || "",
          nodeId: l.nodeId,
        }))
      : [];
    return {
      id,
      layoutId: String(rec.workflowId || ""),
      layoutName: rec.layoutName || rec.workflowName || "",
      type: "workflow",
      format: rec.format,
      status: rec.status || "pending",
      progress: typeof rec.progress === "number" ? rec.progress : 0,
      createdAt: rec.startTime || rec.createdAt || new Date(),
      completedAt: rec.completedAt || rec.endTime,
      requestData: rec.requestData ?? rec.inputData,
      responseData: outputs.length ? { outputs } : (rec.responseData || undefined),
      logs,
      workflowId: String(rec.workflowId || ""),
      executedNodes: outputs.length,
      errorMessage: rec.errorMessage,
    } as Job;
  };

  // Load jobs from backend and keep in sync
  const refreshJobs = async () => {
    try {
      const execs = await listExecutions({ limit: 200 });
      setJobs(execs.map(toJob));
    } catch (e) {
      console.warn("Failed to load executions:", e);
    }
  };

  useEffect(() => {
    refreshJobs();
    const onCreated = () => refreshJobs();
    window.addEventListener("jobs:created", onCreated as any);
    return () => window.removeEventListener("jobs:created", onCreated as any);
  }, []);

  // Persist last active tab across refreshes
  useEffect(() => {
    const last = sessionStorage.getItem("activeTab");
    if (last) setActiveTab(last);
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("activeTab", activeTab); } catch {}
  }, [activeTab]);

// Accept string to satisfy LayoutDesigner, then normalize to our allowed set
const handleExport = async (format: string, exportZones: LayoutZone[]) => {
  const allowed = ["pdf", "html", "png", "tiff", "json"] as const;
  type Allowed = typeof allowed[number];
  const fmt: Allowed = (allowed.includes(format as any) ? (format as Allowed) : "json");

  const newJob: Job = {
    id: `job-${Date.now()}`,
    layoutId: "layout-current",
    layoutName: "Current Layout",
    type: "export",
    format: fmt as Job["format"],
    status: "processing",
    progress: 0,
    createdAt: new Date(),
    requestData: { zones: exportZones, format: fmt },
    logs: [
      { id: `log-${Date.now()}`, timestamp: new Date(), level: "info", message: `${fmt.toUpperCase()} export started` },
    ],
  };

  setJobs((prev) => [newJob, ...prev]);
  toast(`${fmt.toUpperCase()} export started`);

  // Simulate work
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      setJobs((prev) =>
        prev.map((job) =>
          job.id === newJob.id
            ? {
                ...job,
                status: "completed",
                progress: 100,
                completedAt: new Date(),
                responseData: {
                  downloadUrl: fmt === "json"
                    ? "https://example.com/export.json"
                    : `https://example.com/export.${fmt}`,
                },
                logs: [
                  ...job.logs,
                  { id: `log-${Date.now()}`, timestamp: new Date(), level: "info", message: `${fmt.toUpperCase()} export completed successfully` },
                ],
              }
            : job
        )
      );

      toast(`${fmt.toUpperCase()} export completed!`);
    } else {
      setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { ...job, progress: Math.round(progress) } : job)));
    }
  }, 1000);

  setActiveTab("jobs");
};


  const handleMigrationJob = (transaction: Omit<MigrationTransaction, "id" | "createdAt" | "logs">) => {
    const migrationJob: Job = {
      id: `migration-${Date.now()}`,
      layoutId: `migration-${Date.now()}`,
      layoutName: transaction.name,
      type: "migration",
      status: "processing",
      progress: 0,
      createdAt: new Date(),
      sourcePlatform: transaction.sourcePlatform.name,
      targetPlatform: transaction.targetPlatform.name,
      totalItems: transaction.totalItems,
      processedItems: 0,
      failedItems: 0,
      requestData: { templates: transaction.templates.map((t) => t.id), settings: transaction.settings },
      logs: [{ id: `log-${Date.now()}`, timestamp: new Date(), level: "info", message: `Migration from ${transaction.sourcePlatform.name} to ${transaction.targetPlatform.name} started` }],
    };

    setJobs((prev) => [migrationJob, ...prev]);
    toast(`Migration from ${transaction.sourcePlatform.name} to ${transaction.targetPlatform.name} started`);

    let progress = 0;
    let processedItems = 0;
    const totalItems = transaction.totalItems;

    const interval = setInterval(() => {
      progress += Math.random() * 20;
      processedItems += Math.floor(Math.random() * 3);

      if (progress >= 100 || processedItems >= totalItems) {
        progress = 100;
        processedItems = Math.min(processedItems, totalItems);
        const failedItems = Math.floor(Math.random() * 3);
        clearInterval(interval);

        setJobs((prev) =>
          prev.map((job) =>
            job.id === migrationJob.id
              ? {
                  ...job,
                  status: "completed",
                  progress: 100,
                  processedItems,
                  failedItems,
                  completedAt: new Date(),
                  responseData: { successful: processedItems - failedItems, failed: failedItems, migrationUrl: `https://example.com/${migrationJob.id}` },
                  logs: [...job.logs, { id: `log-${Date.now()}`, timestamp: new Date(), level: "info", message: `Migration completed: ${processedItems - failedItems} successful, ${failedItems} failed` }],
                }
              : job
          )
        );

        toast(`Migration completed: ${processedItems - failedItems} successful, ${failedItems} failed`);
      } else {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === migrationJob.id ? { ...job, progress: Math.round(progress), processedItems: Math.min(processedItems, totalItems) } : job
          )
        );
      }
    }, 1500);

    setActiveTab("jobs");
  };

  const handleWorkflowExecution = (workflow: Workflow, execResult?: Partial<WorkflowExecution>) => {
    const jobId = `workflow-${Date.now()}`;

    const newJob: Job = {
      id: jobId,
      layoutId: workflow.id,
      layoutName: workflow.name,
      type: "workflow",
      status: "processing",
      progress: 0,
      createdAt: new Date(),
      workflowId: workflow.id,
      workflowNodes: workflow.nodes.length,
      executedNodes: 0,
      requestData: {
        workflow: { id: workflow.id, name: workflow.name, nodes: workflow.nodes.length },
        inputData: execResult?.inputData ?? null,
      },
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          level: "info",
          message: `Workflow execution started: ${workflow.name}`,
        },
      ],
    };

    setJobs((prev) => [newJob, ...prev]);
    toast(`Workflow execution started: ${workflow.name}`);
    setActiveTab("jobs");

    if (execResult) {
      const status = execResult.status ?? "completed";

      const outputs =
        (execResult.results || []).map((r) => ({
          type: r.outputType || "unknown",
          url: (r as any).url || (r as any).data || undefined,
          data: (r as any).data,
        })) || [];

      const extraLogs: LogEntry[] = (execResult.logs || []).map((l, idx) => ({
        id: `log-${Date.now()}-${idx}`,
        timestamp: l.timestamp ? new Date(l.timestamp) : new Date(),
        level: (l as any).level || "info",
        message: l.message || "",
        ...(l as any).nodeId ? { nodeId: (l as any).nodeId } : {},
      }));

      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j;
          return {
            ...j,
            status: status === "completed" ? "completed" : status === "failed" ? "failed" : j.status,
            progress: status === "completed" ? 100 : j.progress,
            completedAt: status === "completed" ? new Date() : j.completedAt,
            executedNodes: execResult.results && execResult.results.length ? execResult.results.length : j.executedNodes,
            responseData: {
              ...(j.responseData || {}),
              outputs: outputs.length ? outputs : j.responseData?.outputs || [],
            },
            logs: [
              ...j.logs,
              ...extraLogs,
              {
                id: `log-${Date.now()}-result`,
                timestamp: new Date(),
                level: status === "completed" ? "info" : "error",
                message: status === "completed" ? "Workflow returned results" : "Workflow failed",
              },
            ],
          } as Job;
        })
      );

      if (status === "completed") toast(`Workflow completed: ${workflow.name}`);
      if (status === "failed") toast.error(`Workflow failed: ${workflow.name}`);
      return;
    }

    // Simulated fallback
    let progress = 0;
    let executedNodes = 0;
    const totalNodes = workflow.nodes.length || 1;

    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (Math.random() > 0.7) executedNodes += 1;

      if (progress >= 100 || executedNodes >= totalNodes) {
        progress = 100;
        executedNodes = Math.min(executedNodes, totalNodes);
        clearInterval(interval);

        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "completed",
                  progress: 100,
                  executedNodes,
                  completedAt: new Date(),
                  responseData: job.responseData ?? { outputs: [] },
                  logs: [
                    ...job.logs,
                    {
                      id: `log-${Date.now()}`,
                      timestamp: new Date(),
                      level: "info",
                      message: `Workflow completed: ${executedNodes}/${totalNodes} nodes executed successfully`,
                    },
                  ],
                }
              : job
          )
        );

        toast(`Workflow completed: ${executedNodes}/${totalNodes} nodes executed`);
      } else {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? { ...job, progress: Math.round(progress), executedNodes: Math.min(executedNodes, totalNodes) }
              : job
          )
        );
      }
    }, 2000);
  };

  const handleSaveWorkflow = (workflow: Workflow) => {
    setWorkflows((prev) => {
      const existing = prev.find((w) => w.id === workflow.id);
      return existing ? prev.map((w) => (w.id === workflow.id ? workflow : w)) : [workflow, ...prev];
    });
    toast("Workflow saved successfully!");
  };

  const handleSaveLayout = (saveZones: LayoutZone[]) => {
    setZones(saveZones);
    if (currentVersion) setCurrentVersion({ ...currentVersion, zones: saveZones });
    toast("Layout saved successfully!");
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
    toast("Job deleted");
  };

  const handleRetryJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: "processing",
              progress: 0,
              errorMessage: undefined,
              logs: [
                ...j.logs,
                { id: `log-${Date.now()}`, timestamp: new Date(), level: "info", message: "Job retried" },
              ],
            }
          : j
      )
    );
    toast("Job retried");
  };

  const handleDownloadResult = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job && job.responseData?.downloadUrl) {
      toast("Download started (simulated)");
    }
  };

  const handleCreateVersion = (versionData: Omit<LayoutVersion, "id" | "createdAt">) => {
    const newVersion: LayoutVersion = { ...versionData, id: `version-${Date.now()}`, createdAt: new Date(), zones };
    setVersions((prev) => [newVersion, ...prev]);
    toast("New version created successfully!");
  };

  const handleRestoreVersion = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (!version) return;
    setZones(version.zones);
    setCurrentVersion(version);
    setVersions((prev) => prev.map((v) => ({ ...v, isActive: v.id === versionId })));
    toast(`Restored to ${version.version}`);
    setActiveTab("designer");
  };

  const handleDeleteVersion = (versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
    toast("Version deleted");
  };

  const handlePreviewVersion = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (version) toast(`Previewing ${version.version} (feature coming soon)`);
  };

  const handleExportVersion = (versionId: string) => {
    const version = versions.find((v) => v.id === versionId);
    if (version) handleExport("pdf", version.zones);
  };

  const availableLayouts = [
    ...versions.map((v) => ({ id: v.id, name: v.name, zones: v.zones })),
    { id: "current", name: "Current Layout", zones },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-screen">
        <div className="border-b bg-card">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="designer" className="flex items-center">
              <Layout className="w-4 h-4 mr-2" />
              Layout Designer
            </TabsTrigger>

            <TabsTrigger value="workflow" className="flex items-center">
              <WorkflowIcon className="w-4 h-4 mr-2" />
              Workflow Designer
            </TabsTrigger>

            <TabsTrigger value="migration" className="flex items-center">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Migration
            </TabsTrigger>

            <TabsTrigger value="jobs" className="flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Jobs Dashboard
            </TabsTrigger>

            <TabsTrigger value="versions" className="flex items-center">
              <GitBranch className="w-4 h-4 mr-2" />
              Version Control
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="designer" className="h-full m-0">
          <LayoutDesigner
            // NEW: give the gallery to the designer (wrap zones in structure)
            templates={PRESET_TEMPLATES.map((p) => ({ id: p.id, name: p.name, structure: { zones: p.zones } }))}
            onExport={handleExport}
            onSave={handleSaveLayout}
          />
        </TabsContent>

        <TabsContent value="workflow" className="h-full m-0">
          <WorkflowDesigner layouts={availableLayouts} onExecuteWorkflow={handleWorkflowExecution} onSaveWorkflow={handleSaveWorkflow} />
        </TabsContent>

        <TabsContent value="migration" className="h-full m-0">
          <Migration onCreateJob={handleMigrationJob} />
        </TabsContent>

        <TabsContent value="jobs" className="h-full m-0">
          <JobsDashboard jobs={jobs} onDeleteJob={handleDeleteJob} onRetryJob={handleRetryJob} onDownloadResult={handleDownloadResult} />
        </TabsContent>

        <TabsContent value="versions" className="h-full m-0">
          <VersionControl
            versions={versions}
            currentVersion={currentVersion}
            onCreateVersion={handleCreateVersion}
            onRestoreVersion={handleRestoreVersion}
            onDeleteVersion={handleDeleteVersion}
            onPreviewVersion={handlePreviewVersion}
            onExportVersion={handleExportVersion}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

