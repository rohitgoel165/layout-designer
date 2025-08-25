// src/templates/presets.ts
import type { LayoutZone } from "../components/LayoutDesigner";

export type Preset = {
  id: string;
  name: string;
  zones: LayoutZone[];
};

export const PRESETS: Preset[] = [
  {
    id: "letter-basic",
    name: "Letter – Greeting",
    zones: [
      {
        id: "rect-1",
        type: "rect",
        x: 40,
        y: 40,
        width: 520,
        height: 100,
        content: "",
        isDynamic: false,
        styles: {
          backgroundColor: "transparent",
          border: "1px solid #999",
        },
      },
      {
        id: "txt-1",
        type: "text",
        x: 50,
        y: 60,
        width: 300,
        height: 30,
        content: "Dear {{Name}}",
        isDynamic: false,
        styles: {
          fontSize: 16,
          fontWeight: "normal",
          color: "#000000",
          backgroundColor: "transparent",
          border: "1px solid #ccc",
        },
      },
    ],
  },
  {
    id: "invoice-mini",
    name: "Invoice – Mini",
    zones: [
      {
        id: "txt-inv-title",
        type: "text",
        x: 50,
        y: 40,
        width: 200,
        height: 48,
        content: "Invoice",
        isDynamic: false,
        styles: { fontSize: 18, fontWeight: "bold", color: "#000000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "txt-inv-to",
        type: "text",
        x: 50,
        y: 80,
        width: 300,
        height: 42,
        content: "To: {{Name}}",
        isDynamic: false,
        styles: { fontSize: 14, color: "#000000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "txt-inv-amount",
        type: "text",
        x: 50,
        y: 110,
        width: 300,
        height: 42,
        content: "Amount: {{Amount}}",
        isDynamic: false,
        styles: { fontSize: 14, color: "#000000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "txt-inv-due",
        type: "text",
        x: 50,
        y: 140,
        width: 300,
        height: 42,
        content: "Due: {{DueDate}}",
        isDynamic: false,
        styles: { fontSize: 14, color: "#000000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
    ],
  },
  {
    id: "label-qr",
    name: "QR Label",
    zones: [
      {
        id: "txt-title",
        type: "text",
        x: 50,
        y: 40,
        width: 250,
        height: 44,
        content: "Scan for Details",
        isDynamic: false,
        styles: { fontSize: 16, fontWeight: "bold", color: "#000000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "img-qr-placeholder",
        type: "image",
        x: 50,
        y: 70,
        width: 150,
        height: 150,
        content: "qr-placeholder.png", // or make dynamic with {{QrPath}}
        isDynamic: false,
        styles: { border: "1px solid #ccc", backgroundColor: "transparent" },
      },
      {
        id: "txt-sub",
        type: "text",
        x: 50,
        y: 230,
        width: 300,
        height: 40,
        content: "Ref: {{Reference}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
    ],
  },
];

export default PRESETS;
