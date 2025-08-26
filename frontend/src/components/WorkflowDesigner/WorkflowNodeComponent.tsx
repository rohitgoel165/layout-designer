import React from "react";
import { Badge } from "../ui/badge";
import { WorkflowNode } from "./types";

const getNodeColor = (type: string) => {
  switch (type) {
    case "input": return "bg-blue-100 border-blue-300";
    case "processing": return "bg-green-100 border-green-300";
    case "output": return "bg-orange-100 border-orange-300";
    default: return "bg-gray-100 border-gray-300";
  }
};

export default function WorkflowNodeComponent({
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
  const Port = ({ onDown, title }: { onDown: (e: React.MouseEvent) => void; title?: string }) => (
    <div
      title={title}
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onDown(e); }}
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
          <Badge variant="outline" className="text-[10px] py-0 px-1">{node.type}</Badge>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-0.5">
            {node.inputs.map((input) => (
              <div key={input.id} className="flex items-center">
                <div className="mr-1.5">
                  <Port title={`Connect to ${input.label}`} onDown={() => { if (isConnecting) onCompleteConnection(node.id, input.id); }} />
                </div>
                <span className="text-[11px] text-gray-600">{input.label}</span>
              </div>
            ))}
          </div>

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
