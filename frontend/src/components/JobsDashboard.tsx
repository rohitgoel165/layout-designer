// src/components/JobsDashboard.tsx
import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Download, Trash2, RefreshCw, Eye } from "lucide-react";
import { downloadDataUrl, sendEmail, absoluteUrl } from "../api";
import { toast } from "sonner";
import type { Job, JobOutput } from "../types";

/* ------------ helpers ------------ */

const fmt = (d?: Date | string) => {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString();
};

const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u);
const isDataImg = (u?: string) => !!u && /^data:image/i.test(u);
const looksPdf = (t?: string, u?: string) => {
  const tt = (t || "").toLowerCase();
  if (tt === "pdf" || tt === "application/pdf") return true;
  return !!u && /\.pdf(\?|$)/i.test(u || "");
};
const looksZip = (t?: string, u?: string) => {
  const tt = (t || "").toLowerCase();
  if (tt === "zip" || tt === "application/zip" || tt === "pdf-zip") return true;
  return !!u && /\.zip(\?|$)/i.test(u || "");
};

// Prefer sending absolute URLs to backend so it fetches binary content server-side.
// This avoids huge JSON payloads and base64 truncation/corruption.

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();

  if (s === "completed" || s === "success") {
    return <Badge className="border bg-green-100 text-green-700 border-green-200">{status}</Badge>;
  }
  if (s === "failed") {
    return <Badge className="border bg-red-100 text-red-700 border-red-200">{status}</Badge>;
  }
  return <Badge className="border bg-amber-100 text-amber-700 border-amber-200">{status}</Badge>;
}

export function JobsDashboard({
  jobs,
  onDeleteJob,
  onRetryJob,
  onDownloadResult,
}: {
  jobs: Job[];
  onDeleteJob: (id: string) => void;
  onRetryJob: (id: string) => void;
  onDownloadResult: (id: string) => void;
}) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Email UI state
  const [emailTo, setEmailTo] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  /* ------------ derived data ------------ */

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const ad = new Date(a.createdAt as any).getTime();
      const bd = new Date(b.createdAt as any).getTime();
      return bd - ad;
    });
  }, [jobs]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter((j) => (j.status || "").toLowerCase() === "completed").length;
    const failed = jobs.filter((j) => (j.status || "").toLowerCase() === "failed").length;
    const inProgress = jobs.filter((j) => {
      const s = (j.status || "").toLowerCase();
      return s === "processing" || s === "running" || s === "pending";
    }).length;
    const denom = completed + failed;
    const successRate = denom > 0 ? Math.round((completed / denom) * 100) : 0;
    const last = sortedJobs[0]?.createdAt;
    return { total, completed, failed, inProgress, successRate, last };
  }, [jobs, sortedJobs]);

  // Pagination
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedJobs.length / pageSize)), [sortedJobs.length]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedJobs.slice(start, start + pageSize);
  }, [sortedJobs, page]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  /* ------------ email helpers ------------ */

  const openDetails = (job: Job) => {
    setSelectedJob(job);
    setEmailSubject(`Your job ${job.layoutName || job.id} outputs`);
    setEmailMessage(
      `Hello,\n\nPlease find the generated outputs attached for job: ${job.layoutName || job.id}.\n\nThanks!`
    );
  };

  const closeDetails = () => {
    setSelectedJob(null);
    setEmailTo("");
    setEmailSubject("");
    setEmailMessage("");
    setIsSendingEmail(false);
  };

  const renderOutput = (out: JobOutput, idx: number) => {
    const url = out?.url || (typeof out?.data === "string" ? out.data : undefined);
    const isDataImage = isDataImg(url);
    const isHttpUrl = isHttp(url);
    const displayType = (out?.type as string) || (looksPdf(out?.type, url) ? "pdf" : (looksZip(out?.type, url) ? "zip" : ""));

    return (
      <div key={idx} className="p-2 border rounded space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">{displayType || "output"}</div>
          <div className="text-[10px] text-muted-foreground">{idx + 1}</div>
        </div>

        {isDataImage ? (
          <img src={url} alt={`output-${idx}`} className="w-full border" />
        ) : isHttpUrl ? (
          <div className="truncate text-xs">
            <a href={url} target="_blank" rel="noreferrer" className="underline">
              Open output
            </a>
          </div>
        ) : url ? (
          <pre className="text-[11px] truncate max-w-full">{String(url).slice(0, 200)}</pre>
        ) : (
          <div className="text-[11px] text-muted-foreground">No URL/data available</div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">type: {displayType || "-"}</div>

          <div className="space-x-2">
            {isDataImage && typeof url === "string" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  try {
                    downloadDataUrl(url, `output-${idx + 1}.png`);
                  } catch {
                    window.open(url, "_blank");
                  }
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            )}

            {isHttpUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => window.open(url, "_blank")}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Open
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Attachment plan (counts only; the real fetch happens on send)
  const attachmentPlan = useMemo(() => {
    if (!selectedJob?.responseData?.outputs) return { imgs: 0, pdfs: 0, zips: 0 };
    let imgs = 0,
      pdfs = 0,
      zips = 0;
    for (const out of selectedJob.responseData.outputs) {
      const url = out?.url || (typeof out?.data === "string" ? out.data : undefined);
      const t = out?.type;
      if (isDataImg(url)) imgs++;
      else if (looksPdf(t, url) && (isHttp(url) || isDataImg(url))) pdfs++;
      else if (looksZip(t, url) && isHttp(url)) zips++;
    }
    return { imgs, pdfs, zips };
  }, [selectedJob]);

  async function buildEmailAttachments(job: Job) {
    const atts: Array<{ filename: string; content: string }> = [];
    const outputs = job?.responseData?.outputs || [];

    let pdfCounter = 0;
    let imgCounter = 0;
    let zipCounter = 0;

    for (let i = 0; i < outputs.length; i++) {
      const out = outputs[i];
      const url = out?.url || (typeof out?.data === "string" ? out.data : undefined);
      const type = (out?.type || "").toLowerCase();

      if (!url) continue;

      // Data image (e.g., QR)
      if (isDataImg(url)) {
        atts.push({
          filename: `${job.id}-image-${++imgCounter}.png`,
          content: url,
        });
        continue;
      }

      // PDFs / ZIPs: send absolute URL; backend will fetch binary content.
      // Ensure URL is absolute (http/https). If relative (/tmp/..), make absolute via API origin.
      const abs = isHttp(url) ? url : absoluteUrl(url) || undefined;
      if (!abs) continue;
      if (looksPdf(type, abs)) {
        atts.push({ filename: `${job.id}-doc-${++pdfCounter}.pdf`, content: abs });
        continue;
      }
      if (looksZip(type, abs)) {
        atts.push({ filename: `${job.id}-outputs-${++zipCounter}.zip`, content: abs });
        continue;
      }
    }

    return atts;
  }

  const handleSendEmail = async () => {
    if (!selectedJob) return;
    if (!emailTo) {
      toast.error("Please enter a recipient email.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const attachments = await buildEmailAttachments(selectedJob);
      if (attachments.length === 0) {
        toast.error("No outputs available to attach (images/PDFs/ZIPs).");
        setIsSendingEmail(false);
        return;
      }

      await sendEmail({
        to: emailTo,
        subject: emailSubject || `Job ${selectedJob.id} outputs`,
        text: emailMessage || "See attached outputs.",
        attachments,
      });

      toast.success(`Email sent with ${attachments.length} attachment(s).`);
    } catch (err: any) {
      toast.error(`Failed to send email: ${err?.message || String(err)}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  /* ------------ render ------------ */

  return (
    <div className="p-4 md:p-6">
      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <Card className="py-2">
          <CardContent className="py-3">
            <div className="text-[10px] uppercase text-muted-foreground">Total</div>
            <div className="text-xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="py-2 border-green-200">
          <CardContent className="py-3">
            <div className="text-[10px] uppercase text-green-700">Completed</div>
            <div className="text-xl font-semibold text-green-700">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="py-2 border-amber-200">
          <CardContent className="py-3">
            <div className="text-[10px] uppercase text-amber-700">In-Progress</div>
            <div className="text-xl font-semibold text-amber-700">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="py-2 border-red-200">
          <CardContent className="py-3">
            <div className="text-[10px] uppercase text-red-700">Failed</div>
            <div className="text-xl font-semibold text-red-700">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="py-3">
            <div className="text-[10px] uppercase text-muted-foreground">Success Rate</div>
            <div className="text-xl font-semibold">{stats.successRate}%</div>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="py-3">
            <div className="text-[10px] uppercase text-muted-foreground">Last Job</div>
            <div className="text-xs">{fmt(stats.last)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Jobs Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedJobs.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6">
              No jobs yet. Execute a workflow to see it here.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full table-fixed text-xs sm:text-sm">
                <thead className="sticky top-0 bg-white z-10 border-b">
                  <tr className="text-[11px] text-muted-foreground">
                    <th className="p-3 w-36">Job ID</th>
                    <th className="p-3">Layout / Name</th>
                    <th className="p-3 w-24">Type</th>
                    <th className="p-3 w-28">Status</th>
                    <th className="p-3 w-24">Progress</th>
                    <th className="p-3 w-44">Created</th>
                    <th className="p-3 w-56 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((job) => {
                    const statusNorm = (job.status || "").toLowerCase();
                    const displayName = String(job.layoutName || job.workflowId || "").replace(/[\uFFFD\u2013\u2014]/g, "-");
                    const isFailed = statusNorm === "failed";
                    return (
                      <tr key={job.id} className="border-t hover:bg-muted/30">
                        <td className="p-3 w-36 truncate font-mono">{job.id}</td>
                        <td className="p-3">
                          <div className="font-medium truncate">
                            {displayName || "-"}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {job.type}
                          </div>
                        </td>
                        <td className="p-3 w-24 truncate">{job.format || "-"}</td>
                        <td className="p-3 w-28">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="p-3 w-24">{job.progress ?? 0}%</td>
                        <td className="p-3 w-44">{fmt(job.createdAt)}</td>
                        <td className="p-3 w-56">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => openDetails(job)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>

                            {isFailed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => onRetryJob(job.id)}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Retry
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-2"
                              onClick={() => {
                                if (confirm("Delete job?")) onDeleteJob(job.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-3 border-t text-xs">
                <div>
                  Page {page} of {totalPages} • {sortedJobs.length} jobs
                </div>
                <div className="space-x-2">
                  <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => canPrev && setPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button size="sm" variant="outline" disabled={!canNext} onClick={() => canNext && setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details modal (simple) */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetails();
          }}
        >
          <div className="bg-white rounded-lg w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] overflow-auto p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-semibold">
                  {selectedJob.layoutName || selectedJob.id}
                </h3>
                <div className="text-[11px] text-muted-foreground">
                  Job ID: {selectedJob.id}
                </div>
              </div>
              <div className="space-x-2">
                <Button size="sm" className="h-8 px-3" onClick={closeDetails}>
                  Close
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-sm">Status & Info</h4>
                <div className="text-xs space-y-1">
                  <div><strong>Status:</strong> {selectedJob.status}</div>
                  <div><strong>Progress:</strong> {selectedJob.progress}%</div>
                  <div><strong>Created:</strong> {fmt(selectedJob.createdAt)}</div>
                  <div><strong>Completed:</strong> {fmt(selectedJob.completedAt)}</div>
                  {selectedJob.errorMessage && (
                    <div className="mt-2 text-red-600">
                      <strong>Error:</strong> {selectedJob.errorMessage}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h5 className="font-medium mb-2 text-sm">Request</h5>
                  <pre className="text-[11px] bg-muted p-2 rounded max-h-40 overflow-auto">
                    {JSON.stringify(selectedJob.requestData, null, 2)}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-sm">Outputs</h4>

                {Array.isArray(selectedJob.responseData?.outputs) &&
                selectedJob.responseData!.outputs!.length > 0 ? (
                  <div className="space-y-2">
                    {selectedJob.responseData!.outputs!.map((out, i) => renderOutput(out, i))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">No outputs available for this job.</div>
                )}

                {/* Send via Email */}
                <div className="mt-5 pt-4 border-t">
                  <h4 className="font-medium mb-2 text-sm">Send via Email</h4>
                  <div className="text-[11px] text-muted-foreground mb-2">
                    {attachmentPlan.imgs + attachmentPlan.pdfs + attachmentPlan.zips > 0
                      ? `Will attach ${attachmentPlan.imgs + attachmentPlan.pdfs + attachmentPlan.zips} file(s): ` +
                        `${attachmentPlan.imgs} image(s), ${attachmentPlan.pdfs} PDF(s), ${attachmentPlan.zips} ZIP(s).`
                      : "No outputs available to attach."}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      className="w-full border rounded p-2 text-xs"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Subject"
                      className="w-full border rounded p-2 text-xs"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                    <textarea
                      placeholder="Message"
                      className="w-full border rounded p-2 text-xs"
                      rows={4}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" className="h-8 px-3" onClick={handleSendEmail} disabled={isSendingEmail}>
                        {isSendingEmail ? "Sending..." : "Send Email"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {selectedJob.responseData?.outputs &&
                selectedJob.responseData.outputs.length > 0 && (
                  <Button size="sm" className="h-8 px-3" onClick={() => onDownloadResult(selectedJob.id)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Result
                  </Button>
                )}

              <Button
                size="sm"
                variant="destructive"
                className="h-8 px-3"
                onClick={() => {
                  if (confirm("Delete job?")) {
                    onDeleteJob(selectedJob.id);
                    closeDetails();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Job
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobsDashboard;




