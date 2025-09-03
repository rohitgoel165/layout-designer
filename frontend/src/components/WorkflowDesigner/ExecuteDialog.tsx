// src/components/WorkflowDesigner/ExecuteDialog.tsx
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Play } from "lucide-react";
import {
  BTN_COMPACT,
  DEFAULT_OUTPUT_FORMATS,
  DEFAULT_DELIVERY_MODE,
} from "./types";

type AnyWorkflow = {
  name: string;
  nodes: Array<{ type: string; subtype: string; config?: Record<string, any> }>;
  connections: any[];
  outputFormats?: ("pdf" | "qrcode")[];
  deliveryMode?: "ftp" | "api" | "email";
};

function pickOutputSettings(workflow: AnyWorkflow) {
  const tpl = workflow.nodes.find((n) => n.type === "processing" && n.subtype === "template");
  const cfg = (tpl?.config as any) || {};
  const outputFormats = workflow.outputFormats ?? cfg.outputFormats ?? DEFAULT_OUTPUT_FORMATS;
  const deliveryMode = workflow.deliveryMode ?? cfg.deliveryMode ?? DEFAULT_DELIVERY_MODE;
  return { outputFormats, deliveryMode };
}

export default function WorkflowExecuteDialog({
  workflow,
  onExecute,
  onCancel,
}: {
  workflow: AnyWorkflow;
  onExecute: (inputData?: any) => void;
  onCancel: () => void;
}) {
  const [inputData, setInputData] = useState<string>("{}");
  const handleExecute = () => {
    try {
      onExecute(JSON.parse(inputData));
    } catch {
      onExecute();
    }
  };

  const { outputFormats, deliveryMode } = pickOutputSettings(workflow);
  const fmtHas = (f: "pdf" | "qrcode") => (outputFormats || []).includes(f);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px]">Workflow Summary</Label>
        <div className="mt-2 p-3 bg-muted rounded text-xs space-y-1.5">
          <p><strong>Name:</strong> {workflow.name}</p>
          <p><strong>Nodes:</strong> {workflow.nodes.length}</p>
          <p><strong>Connections:</strong> {workflow.connections.length}</p>

          {/* NEW: Output settings */}
          <div className="pt-1.5">
            <p className="mb-1"><strong>Output formats:</strong></p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={fmtHas("pdf") ? "default" : "secondary"} className="text-[10px]">
                PDF
              </Badge>
              <Badge variant={fmtHas("qrcode") ? "default" : "secondary"} className="text-[10px]">
                QR output
              </Badge>
            </div>
          </div>

          <div className="pt-1.5">
            <p className="mb-1"><strong>Delivery mode:</strong></p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {deliveryMode}
            </Badge>
          </div>

          <p className="text-[10px] text-muted-foreground pt-1">
            To change these, open the Template node in the right panel.
          </p>
        </div>
      </div>

      <div>
        <Label className="text-[11px]">Input Data (JSON)</Label>
        <Textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          rows={6}
          className="text-[12px]"
        />
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
