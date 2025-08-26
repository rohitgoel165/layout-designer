export const COMPACT = true as const;
export const PANEL_FONT = COMPACT ? "text-xs" : "text-sm";
export const LEFT_WIDTH = COMPACT ? "w-60" : "w-72";
export const RIGHT_WIDTH = COMPACT ? "w-72" : "w-80";
export const GRID_SIZE = COMPACT ? 16 : 20;
export const NODE_DEFAULT = COMPACT ? { w: 160, h: 96 } : { w: 220, h: 140 };
export const BTN_COMPACT = "h-8 px-2 text-[12px]";
export const LABEL_SM = "text-[11px]";

export type TablePayload = { columns: string[]; data: (string | number)[][] };

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
  structure?: { zones?: any[] } | any;
};
