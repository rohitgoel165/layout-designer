// src/templates/presets.ts
import type { LayoutZone } from "../components/LayoutDesigner";

export type Preset = {
  id: string;
  name: string;
  zones: LayoutZone[];
};

export const PRESETS: Preset[] = [
  /* ====== existing ====== */
  {
    id: "letter-basic",
    name: "Letter – Greeting",
    zones: [
      {
        id: "rect-1",
        type: "rect",
        x: 40,
        y: 40,
        width: 515,
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
        content: "qr-placeholder.png",
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

  /* ======   /* ====== NEW: Invoice – GST ====== */
  {
    id: "invoice-gst-a4",
    name: "Invoice – GST (A4)",
    zones: [
      // header band
      {
        id: "hdr-rect",
        type: "rect",
        x: 40,
        y: 30,
        width: 515,
        height: 110,
        content: "",
        isDynamic: false,
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      // logo
      {
        id: "img-logo",
        type: "image",
        x: 52,
        y: 44,
        width: 80,
        height: 80,
        content: "logo-placeholder.png",
        isDynamic: true,
        variableName: "companyLogo", // âœ… match helpers / NodePropertiesPanel
        styles: { border: "1px solid #ccc", backgroundColor: "transparent" },
      },
      // company name & address
      {
        id: "txt-company",
        type: "text",
        x: 140,
        y: 48,
        width: 420,
        height: 36,
        content: "{{CompanyName}}",
        isDynamic: false,
        styles: { fontSize: 20, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "txt-company-addr",
        type: "text",
        x: 140,
        y: 82,
        width: 515,
        height: 46,
        content: "{{CompanyAddress}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      // invoice meta
      {
        id: "txt-inv-meta",
        type: "text",
        x: 590,
        y: 48,
        width: 150,
        height: 72,
        content: "INVOICE\nNo: {{InvoiceNo}}\nDate: {{InvoiceDate}}",
        isDynamic: false,
        styles: { fontSize: 12, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },

      // parties
      {
        id: "rect-billto",
        type: "rect",
        x: 40,
        y: 150,
        width: 357,
        height: 110,
        content: "",
        isDynamic: false,
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      {
        id: "rect-shipto",
        type: "rect",
        x: 397,
        y: 150,
        width: 357,
        height: 110,
        content: "",
        isDynamic: false,
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      {
        id: "txt-billto",
        type: "text",
        x: 50,
        y: 160,
        width: 337,
        height: 90,
        content: "Bill To:\n{{BillToName}}\n{{BillToAddress}}\nGSTIN: {{BillToGSTIN}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "txt-shipto",
        type: "text",
        x: 407,
        y: 160,
        width: 337,
        height: 90,
        content: "Ship To:\n{{ShipToName}}\n{{ShipToAddress}}\nGSTIN: {{ShipToGSTIN}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },

      // items table
      {
        id: "tbl-items",
        type: "table",
        x: 40,
        y: 272,
        width: 515,
        height: 360,
        content: JSON.stringify(
          {
            columns: [
              { key: "description", label: "Description", width: 260 },
              { key: "hsn", label: "HSN/SAC", width: 80 },
              { key: "qty", label: "Qty", width: 60, align: "right" },
              { key: "rate", label: "Rate", width: 80, align: "right", format: "currency" },
              { key: "amount", label: "Amount", width: 100, align: "right", format: "currency" },
              { key: "gst", label: "GST %", width: 60, align: "right" },
            ],
            dataVar: "Items",
          },
          null,
          2
        ),
        isDynamic: true,
        variableName: "Items",
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },

      // totals
      {
        id: "txt-subtotals",
        type: "text",
        x: 440,
        y: 640,
        width: 314,
        height: 80,
        content:
          "Sub-Total: {{SubTotal}}\nCGST: {{CGST}}\nSGST: {{SGST}}\nIGST: {{IGST}}\nGrand Total: {{GrandTotal}}",
        isDynamic: false,
        styles: { fontSize: 12, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "txt-words",
        type: "text",
        x: 40,
        y: 640,
        width: 380,
        height: 60,
        content: "Amount in words:\n{{AmountInWords}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
    ],
  },

  /* ======   /* ====== NEW: Payslip – IT ====== */
  {
    id: "payslip-india-it",
    name: "Payslip – IT (A4)",
    zones: [
      // header band
      {
        id: "ps-hdr",
        type: "rect",
        x: 40,
        y: 30,
        width: 515,
        height: 110,
        content: "",
        isDynamic: false,
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      // logo
      {
        id: "ps-logo",
        type: "image",
        x: 52, y: 44, width: 80, height: 80,
        content: "logo-placeholder.png",
        isDynamic: true,
        variableName: "companyLogo",
        styles: { border: "1px solid #ccc", backgroundColor: "transparent" },
      },
      // company + title
      {
        id: "ps-company",
        type: "text",
        x: 140,
        y: 48,
        width: 420,
        height: 36,
        content: "{{CompanyName}}",
        isDynamic: false,
        styles: { fontSize: 20, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "ps-company-addr",
        type: "text",
        x: 140,
        y: 82,
        width: 420,
        height: 40,
        content: "{{CompanyAddress}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "ps-title",
        type: "text",
        x: 590,
        y: 48,
        width: 150,
        height: 72,
        content: "Payslip\n{{PayMonth}} {{PayYear}}",
        isDynamic: false,
        styles: { fontSize: 12, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },

      // employee details
      {
        id: "ps-emp-rect",
        type: "rect",
        x: 40,
        y: 150,
        width: 515,
        height: 110,
        content: "",
        isDynamic: false,
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      {
        id: "ps-emp-lines",
        type: "text",
        x: 50,
        y: 160,
        width: 515,
        height: 90,
        content:
          "Employee: {{EmployeeName}}  |  Emp ID: {{EmployeeId}}  |  Dept: {{Department}}  |  Desig: {{Designation}}\n" +
          "PAN: {{PAN}}  |  UAN: {{UAN}}  |  PF No: {{PFNo}}  |  ESI No: {{ESINo}}\n" +
          "Bank: {{BankName}}  |  A/C: {{BankAccount}}  |  IFSC: {{IFSC}}\n" +
          "Work Days: {{DaysWorked}} / {{DaysInMonth}}  |  LOP: {{LOP}}",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },

      // section headings
      {
        id: "ps-earnings-h",
        type: "text",
        x: 50,
        y: 276,
        width: 320,
        height: 24,
        content: "EARNINGS",
        isDynamic: false,
        styles: { fontSize: 14, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "ps-deductions-h",
        type: "text",
        x: 424,
        y: 276,
        width: 320,
        height: 24,
        content: "DEDUCTIONS",
        isDynamic: false,
        styles: { fontSize: 14, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },

      // earnings table (now bound to earningsTable)
      {
        id: "ps-earnings",
        type: "table",
        x: 44, y: 304, width: 330, height: 260,
        content: "",               // <â€” no JSON string anymore
        isDynamic: true,
        variableName: "earningsTable", // matches helpers.ts
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      {
        id: "ps-deductions",
        type: "table",
        x: 410, y: 304, width: 330, height: 260,
        content: "",
        isDynamic: true,
        variableName: "deductionsTable",
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      // totals block
      {
        id: "ps-totals-rect",
        type: "rect",
        x: 40,
        y: 584,
        width: 515,
        height: 90,
        content: "",
        isDynamic: false,
        styles: { backgroundColor: "transparent", border: "1px solid #999" },
      },
      {
        id: "ps-gross-vs-ded",
        type: "text",
        x: 50,
        y: 598,
        width: 515,
        height: 24,
        content: "Gross Earnings: {{GrossEarnings}}    Total Deductions: {{TotalDeductions}}",
        isDynamic: false,
        styles: { fontSize: 12, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "ps-net",
        type: "text",
        x: 50,
        y: 624,
        width: 515,
        height: 26,
        content: "NET PAY: {{NetPay}}",
        isDynamic: false,
        styles: { fontSize: 16, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
      {
        id: "ps-words",
        type: "text",
        x: 50,
        y: 652,
        width: 515,
        height: 40,
        content: "(Rupees {{NetPayInWords}} Only)",
        isDynamic: false,
        styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },

      // footer note
      {
        id: "ps-footer",
        type: "text",
        x: 40,
        y: 740,
        width: 515,
        height: 30,
        content: "This is a system generated payslip and does not require a signature.",
        isDynamic: false,
        styles: { fontSize: 10, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" },
      },
    ],
  },
];

export default PRESETS;


