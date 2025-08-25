// src/types.ts
export type LogEntry = {
  id: string;
  timestamp: Date | string;
  level: "info" | "warning" | "error";
  message: string;
  nodeId?: string;
};

export type JobOutput = {
  type?: string;
  url?: string;
  data?: any;
  endpoint?: string;   // <--- explicitly allowed
  filename?: string;
  [key: string]: any;  // fallback to avoid new errors while prototyping
};

export type Job = {
  id: string;
  layoutId?: string;
  layoutName?: string;
  type?: "export" | "migration" | "workflow" | string;
  format?: string;
  status: "processing" | "completed" | "failed" | "pending";
  progress: number;
  createdAt: Date | string;
  completedAt?: Date | string;
  requestData?: any;
  responseData?: {
    outputs?: JobOutput[];
    [key: string]: any;
  };
  logs: LogEntry[];

  sourcePlatform?: string | { name?: string } | any;
  targetPlatform?: string | { name?: string } | any;
  totalItems?: number;
  processedItems?: number;
  failedItems?: number;

  workflowId?: string;
  workflowNodes?: number;
  executedNodes?: number;

  errorMessage?: string;
  [key: string]: any;
};
