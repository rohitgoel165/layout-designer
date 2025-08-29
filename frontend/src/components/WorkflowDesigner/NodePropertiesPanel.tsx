// src/components/WorkflowDesigner/NodePropertiesPanel.tsx
import React from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Trash2 } from "lucide-react";
import {
  LABEL_SM,
  BTN_COMPACT,
  WorkflowNode,
  // NEW:
  OutputFormat,
  DeliveryMode,
  DEFAULT_OUTPUT_FORMATS,
  DEFAULT_DELIVERY_MODE,
} from "./types";
import { LayoutZone } from "../LayoutDesigner";

export default function NodePropertiesPanel({
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
  const updateConfig = (k: string, v: any) =>
    onUpdateNode({ config: { ...(node.config || {}), [k]: v } });

  const handleFileSelect = (file: File | null, key = "__file") => {
    if (!file) {
      onUpdateNode({
        config: { ...(node.config || {}), [key]: null, __fileDataUrl: null, __rows: null, filePath: "" },
      });
      return;
    }
    const r = new FileReader();
    r.onload = () =>
      onUpdateNode({
        config: { ...(node.config || {}), [key]: file, __fileDataUrl: r.result, filePath: file.name },
      });
    r.readAsDataURL(file);
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
                {Array.isArray(node.config?.__rows) ? ` • Parsed: ${node.config.__rows.length} rows` : ""}
              </div>
            </div>
            <div>
              <Label className={LABEL_SM}>Sheet Name(s) (comma-separated)</Label>
              <Input
                className="h-8 text-[12px]"
                value={node.config.sheetName || "Payslip,Earnings,Deductions"}
                onChange={(e) => updateConfig("sheetName", e.target.value)}
                placeholder="Payslip,Earnings,Deductions"
              />
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

      case "template":
        return (
          <div className="space-y-2">
            <div>
              <Label className={LABEL_SM}>Layout Template</Label>
              <Select
                value={node.config.templateId || ""}
                onValueChange={(v) => updateConfig("templateId", v)}
              >
                <SelectTrigger className="h-8 text-[12px] data-[placeholder]:text-foreground/80">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto z-[1000]">
                  {layouts.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-[12px]">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Label className={LABEL_SM}>Company Logo (image)</Label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-[12px]"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (!f) {
                    updateConfig("companyLogoDataUrl", null);
                    return;
                  }
                  const r = new FileReader();
                  r.onload = () => updateConfig("companyLogoDataUrl", r.result);
                  r.readAsDataURL(f);
                }}
              />
              <div className="text-[11px] text-muted-foreground mt-1">Or paste a URL</div>
              <Input
                className="h-8 text-[12px]"
                value={node.config.companyLogoUrl || ""}
                onChange={(e) => updateConfig("companyLogoUrl", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
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
        <Input
          className="h-8 text-[12px]"
          value={node.label}
          onChange={(e) => onUpdateNode({ label: e.target.value })}
        />
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
          <Trash2 className="w-4 h-4 mr-2" /> Delete Node
        </Button>
      </div>
    </div>
  );
}
