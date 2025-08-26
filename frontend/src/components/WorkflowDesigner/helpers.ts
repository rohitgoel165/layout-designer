// src/components/WorkflowDesigner/helpers.ts
import { TablePayload } from "./types";

type Row = Record<string, any>;
type Sheets = Record<string, Row[]>;

const keyFor = (r: Row) => `${r.EmpCode}|${r.PayMonth}|${r.PayYear}`;

export async function fileFromDataUrl(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "application/octet-stream" });
}

export function joinPayslipSheets(sheets: Sheets, companyLogo?: string | null): Row[] {
  const pay = sheets["Payslip"] || [];
  const earn = sheets["Earnings"] || [];
  const ded  = sheets["Deductions"] || [];

  const bucket = (rows: Row[]) => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      const k = keyFor(r);
      (m.get(k) || m.set(k, []).get(k)!).push(r);
    }
    return m;
  };

  const eMap = bucket(earn);
  const dMap = bucket(ded);

  return pay.map((p) => {
    const eRows = eMap.get(keyFor(p)) || [];
    const dRows = dMap.get(keyFor(p)) || [];

    // what the TABLE zones expect (objects, not tuples)
    const Earnings = eRows.map((r) => ({
      component: String(r.Component ?? ""),
      amount: Number(r.Amount ?? 0),
    }));

    const Deductions = dRows.map((r) => ({
      component: String(r.Component ?? ""),
      amount: Number(r.Amount ?? 0),
    }));

    // keep the old wrappers too (if you still use them elsewhere)
    const earningsTable: TablePayload = {
      columns: ["Component", "Amount"],
      data: eRows.map((r) => [String(r.Component ?? ""), Number(r.Amount ?? 0)]),
    };
    const deductionsTable: TablePayload = {
      columns: ["Component", "Amount"],
      data: dRows.map((r) => [String(r.Component ?? ""), Number(r.Amount ?? 0)]),
    };

    const gross = Earnings.reduce((s, r) => s + (r.amount || 0), 0);
    const totalDed = Deductions.reduce((s, r) => s + (r.amount || 0), 0);

    return {
      ...p,
      // tables for the renderer:
      Earnings,
      Deductions,

      // keep old fields (harmless)
      earningsTable,
      deductionsTable,

      // logo under both casings (renderer will find one)
      companyLogo: companyLogo ?? null,
      CompanyLogo: companyLogo ?? null,

      grossEarnings: gross,
      totalDeductions: totalDed,
      netPay: gross - totalDed,
    };
  });
}
