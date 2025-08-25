// src/templates/presets.ts
import type { LayoutZone } from "../components/LayoutDesigner";

export type Preset = {
  id: string;
  name: string;
  zones: LayoutZone[];
};

export const PRESETS: Preset[] = [
  // ===== Existing presets =====
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

  // ===== New: Invoice (GST-style, India) =====
  {
    id: "invoice-gst",
    name: "Invoice – Detailed (GST)",
    zones: [
      // Header band
      { id: "hdr-rect", type: "rect", x: 40, y: 20, width: 520, height: 120, content: "", isDynamic: false, styles: { border: "1px solid #999", backgroundColor: "transparent" } },
      { id: "hdr-title", type: "text", x: 50, y: 30, width: 250, height: 40, content: "TAX INVOICE", isDynamic: false, styles: { fontSize: 18, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" } },
      { id: "hdr-company", type: "text", x: 50, y: 60, width: 320, height: 22, content: "{{CompanyName}}", isDynamic: true, styles: { fontSize: 14, fontWeight: "bold", color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" } },
      { id: "hdr-address", type: "text", x: 50, y: 82, width: 320, height: 46, content: "{{CompanyAddress}}", isDynamic: true, styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" } },
      { id: "hdr-gstin", type: "text", x: 50, y: 112, width: 200, height: 22, content: "GSTIN: {{CompanyGSTIN}}", isDynamic: true, styles: { fontSize: 12, color: "#000", backgroundColor: "transparent", border: "1px solid #ccc" } },
      // Invoice meta box
      { id: "meta-rect", type: "rect", x: 360, y: 30, width: 200, height: 100, content: "", isDynamic: false, styles: { border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "meta-inv", type: "text", x: 370, y: 40, width: 180, height: 20, content: "Invoice No: {{InvoiceNo}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent", color: "#000" } },
      { id: "meta-date", type: "text", x: 370, y: 60, width: 180, height: 20, content: "Date: {{InvoiceDate}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent", color: "#000" } },
      { id: "meta-po", type: "text", x: 370, y: 80, width: 180, height: 20, content: "PO No: {{PONumber}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent", color: "#000" } },
      // Bill/Ship To
      { id: "bill-rect", type: "rect", x: 40, y: 150, width: 260, height: 100, content: "", isDynamic: false, styles: { border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ship-rect", type: "rect", x: 300, y: 150, width: 260, height: 100, content: "", isDynamic: false, styles: { border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-to-title", type: "text", x: 50, y: 156, width: 240, height: 18, content: "Bill To", isDynamic: false, styles: { fontSize: 12, fontWeight: "bold", color: "#000", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-to", type: "text", x: 50, y: 176, width: 240, height: 64, content: "{{BillToName}}\n{{BillToAddress}}\nGSTIN: {{BillToGSTIN}}", isDynamic: true, styles: { fontSize: 12, color: "#000", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ship-to-title", type: "text", x: 310, y: 156, width: 240, height: 18, content: "Ship To", isDynamic: false, styles: { fontSize: 12, fontWeight: "bold", color: "#000", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ship-to", type: "text", x: 310, y: 176, width: 240, height: 64, content: "{{ShipToName}}\n{{ShipToAddress}}", isDynamic: true, styles: { fontSize: 12, color: "#000", border: "1px solid #ccc", backgroundColor: "transparent" } },
      // Items table
      // NOTE: For the table renderer, read column headers from the content string using 'columns='; rows from {{LineItems}}
      { id: "items-table", type: "table", x: 40, y: 270, width: 520, height: 240, content: "columns=Item|HSN/SAC|Qty|Rate|Tax %|Amount; data={{LineItems}}", isDynamic: true, styles: { border: "1px solid #333", backgroundColor: "transparent" } },
      // Totals box
      { id: "totals-rect", type: "rect", x: 360, y: 520, width: 200, height: 120, content: "", isDynamic: false, styles: { border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "totals-sub", type: "text", x: 370, y: 530, width: 180, height: 18, content: "Subtotal: {{SubTotal}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent", color: "#000" } },
      { id: "totals-sgst", type: "text", x: 370, y: 548, width: 180, height: 18, content: "SGST ({{SGSTPct}}%): {{SGST}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "totals-cgst", type: "text", x: 370, y: 566, width: 180, height: 18, content: "CGST ({{CGSTPct}}%): {{CGST}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "totals-igst", type: "text", x: 370, y: 584, width: 180, height: 18, content: "IGST ({{IGSTPct}}%): {{IGST}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "totals-grand", type: "text", x: 370, y: 602, width: 180, height: 22, content: "Grand Total: {{GrandTotal}}", isDynamic: true, styles: { fontSize: 14, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },
      // Footer terms
      { id: "terms-title", type: "text", x: 40, y: 520, width: 300, height: 18, content: "Terms & Notes", isDynamic: false, styles: { fontSize: 12, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "terms", type: "text", x: 40, y: 540, width: 300, height: 80, content: "{{Terms}}", isDynamic: true, styles: { fontSize: 11, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bank", type: "text", x: 40, y: 626, width: 520, height: 40, content: "Bank: {{BankName}} | A/C: {{BankAccount}} | IFSC: {{IFSC}}", isDynamic: true, styles: { fontSize: 11, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "sign", type: "text", x: 380, y: 650, width: 180, height: 40, content: "For {{CompanyName}}\nAuthorised Signatory", isDynamic: true, styles: { fontSize: 11, textAlign: "right", border: "1px solid #ccc", backgroundColor: "transparent" } },
    ],
  },

  // ===== New: Bill / Simple Receipt =====
  {
    id: "bill-simple",
    name: "Bill / Receipt – Simple",
    zones: [
      { id: "bill-hdr", type: "text", x: 50, y: 30, width: 300, height: 36, content: "BILL / RECEIPT", isDynamic: false, styles: { fontSize: 18, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent", color: "#000" } },
      { id: "bill-seller", type: "text", x: 50, y: 70, width: 300, height: 44, content: "{{SellerName}}\n{{SellerAddress}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-meta", type: "text", x: 380, y: 70, width: 180, height: 44, content: "Bill No: {{BillNo}}\nDate: {{BillDate}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-cust", type: "text", x: 50, y: 130, width: 510, height: 50, content: "Customer: {{CustomerName}} | Phone: {{CustomerPhone}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      // Items
      { id: "bill-items", type: "table", x: 50, y: 190, width: 510, height: 260, content: "columns=Item|Qty|Rate|Amount; data={{LineItems}}", isDynamic: true, styles: { border: "1px solid #333", backgroundColor: "transparent" } },
      // Totals
      { id: "bill-sub", type: "text", x: 360, y: 460, width: 200, height: 18, content: "Subtotal: {{SubTotal}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-tax", type: "text", x: 360, y: 478, width: 200, height: 18, content: "Tax: {{Tax}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-round", type: "text", x: 360, y: 496, width: 200, height: 18, content: "Round Off: {{RoundOff}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-total", type: "text", x: 360, y: 514, width: 200, height: 22, content: "Total: {{GrandTotal}}", isDynamic: true, styles: { fontSize: 14, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "bill-footer", type: "text", x: 50, y: 550, width: 510, height: 50, content: "Thank you for your business!", isDynamic: false, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent", color: "#000" } },
    ],
  },

  // ===== New: Payslip (India – IT company style) =====
  {
    id: "payslip-india-standard",
    name: "Payslip – India (IT Standard)",
    zones: [
      // Header with company info
      { id: "ps-hdr-rect", type: "rect", x: 40, y: 20, width: 520, height: 110, content: "", isDynamic: false, styles: { border: "1px solid #999", backgroundColor: "transparent" } },
      { id: "ps-company", type: "text", x: 50, y: 30, width: 400, height: 24, content: "{{CompanyName}}", isDynamic: true, styles: { fontSize: 16, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-comp-addr", type: "text", x: 50, y: 56, width: 400, height: 44, content: "{{CompanyAddress}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-period", type: "text", x: 380, y: 30, width: 170, height: 44, content: "Payslip\n{{PayMonth}} {{PayYear}}", isDynamic: true, styles: { fontSize: 12, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },

      // Employee details block
      { id: "ps-emp-rect", type: "rect", x: 40, y: 140, width: 520, height: 120, content: "", isDynamic: false, styles: { border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-emp-1", type: "text", x: 50, y: 150, width: 500, height: 18, content: "Employee: {{EmpName}}  |  Emp ID: {{EmpCode}}  |  Dept: {{Department}}  |  Desig: {{Designation}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-emp-2", type: "text", x: 50, y: 170, width: 500, height: 18, content: "PAN: {{PAN}}  |  UAN: {{UAN}}  |  PF No: {{PFNo}}  |  ESI No: {{ESINo}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-emp-3", type: "text", x: 50, y: 190, width: 500, height: 18, content: "Bank: {{BankName}}  |  A/C: {{BankAccount}}  |  IFSC: {{IFSC}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-emp-4", type: "text", x: 50, y: 210, width: 500, height: 18, content: "Work Days: {{PaidDays}} / {{CalendarDays}}  |  LOP: {{LOPDays}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },

      // Earnings and Deductions side-by-side tables
      { id: "ps-earn-title", type: "text", x: 50, y: 270, width: 250, height: 18, content: "EARNINGS", isDynamic: false, styles: { fontSize: 12, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-ded-title", type: "text", x: 330, y: 270, width: 230, height: 18, content: "DEDUCTIONS", isDynamic: false, styles: { fontSize: 12, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },

      // Table content note: supply rows via {{Earnings}} and {{Deductions}} collections
      { id: "ps-earnings", type: "table", x: 40, y: 290, width: 270, height: 240, content: "columns=Component|Amount; data={{Earnings}}", isDynamic: true, styles: { border: "1px solid #333", backgroundColor: "transparent" } },
      { id: "ps-deductions", type: "table", x: 330, y: 290, width: 230, height: 240, content: "columns=Component|Amount; data={{Deductions}}", isDynamic: true, styles: { border: "1px solid #333", backgroundColor: "transparent" } },

      // Summary
      { id: "ps-summary-rect", type: "rect", x: 40, y: 540, width: 520, height: 100, content: "", isDynamic: false, styles: { border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-gross", type: "text", x: 50, y: 550, width: 240, height: 20, content: "Gross Earnings: {{GrossEarnings}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-tot-ded", type: "text", x: 300, y: 550, width: 240, height: 20, content: "Total Deductions: {{TotalDeductions}}", isDynamic: true, styles: { fontSize: 12, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-net", type: "text", x: 50, y: 572, width: 490, height: 24, content: "NET PAY: {{NetPay}}", isDynamic: true, styles: { fontSize: 14, fontWeight: "bold", border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-net-words", type: "text", x: 50, y: 598, width: 490, height: 22, content: "(Rupees {{NetPayInWords}} Only)", isDynamic: true, styles: { fontSize: 12, fontStyle: "italic", border: "1px solid #ccc", backgroundColor: "transparent" } },

      // Footer / signatures
      { id: "ps-note", type: "text", x: 40, y: 650, width: 360, height: 40, content: "This is a system generated payslip and does not require a signature.", isDynamic: false, styles: { fontSize: 11, border: "1px solid #ccc", backgroundColor: "transparent" } },
      { id: "ps-sign", type: "text", x: 420, y: 650, width: 140, height: 40, content: "Authorised Signatory", isDynamic: false, styles: { fontSize: 11, textAlign: "right", border: "1px solid #ccc", backgroundColor: "transparent" } },
    ],
  },
];

export default PRESETS;
