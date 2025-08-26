// src/components/WorkflowDesigner/ExecuteDialog.tsx
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Play } from "lucide-react";
import { BTN_COMPACT } from "./types";

export default function WorkflowExecuteDialog({
  workflow,
  onExecute,
  onCancel,
}: {
  workflow: any;
  onExecute: (inputData?: any) => void;
  onCancel: () => void;
}) {
  const [inputData, setInputData] = useState<string>("{}");
  const handleExecute = () => {
    try { onExecute(JSON.parse(inputData)); } catch { onExecute(); }
  };
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px]">Workflow Summary</Label>
        <div className="mt-2 p-3 bg-muted rounded text-xs">
          <p><strong>Name:</strong> {workflow.name}</p>
          <p><strong>Nodes:</strong> {workflow.nodes.length}</p>
          <p><strong>Connections:</strong> {workflow.connections.length}</p>
        </div>
      </div>
      <div>
        <Label className="text-[11px]">Input Data (JSON)</Label>
        <Textarea value={inputData} onChange={(e) => setInputData(e.target.value)} rows={6} className="text-[12px]" />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleExecute} className={`flex-1 ${BTN_COMPACT}`}>
          <Play className="w-4 h-4 mr-2" /> Execute
        </Button>
        <Button variant="outline" onClick={onCancel} className={`flex-1 ${BTN_COMPACT}`}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
