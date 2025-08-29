// src/components/WorkflowDesigner/nodeTemplates.ts
import { FileText, Globe, Square, Zap, QrCode } from "lucide-react";

export const NODE_TEMPLATES = {
  input: [
    {
      subtype: "excel",
      label: "Excel Input",
      icon: FileText,
      inputs: [],
      outputs: [{ id: "data", label: "Data", type: "tabular" }],
      config: {
        filePath: "",
        sheetName: "Payslip,Earnings,Deductions",
        hasHeaders: true,
        __file: null,
        __fileDataUrl: null,
        __rows: null,
      },
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
      // NEW: defaults for output formats and delivery mode
      config: {
        templateId: "",
        variableMapping: {},
        companyLogoDataUrl: "",
        companyLogoUrl: "",
        outputFormats: ["pdf"], // ← only PDF & QR allowed overall
        deliveryMode: "api",    // ← ftp | api | email
      },
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
    // Keep ONLY these two:
    {
      subtype: "pdf",
      label: "PDF Output",
      icon: FileText,
      inputs: [{ id: "data", label: "Data", type: "document" }],
      outputs: [],
      config: { filename: "output.pdf", quality: "high" },
    },
    {
      subtype: "qrcode",
      label: "QR Code",
      icon: QrCode,
      inputs: [{ id: "data", label: "Data", type: "any" }],
      outputs: [],
      config: { size: 256, errorCorrection: "M" },
    },
  ],
} as const;
