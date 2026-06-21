"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, RefreshCw, History } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SyncRun = {
  id: string;
  connectionName?: string | null;
  platform: string;
  accountId?: string | null;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  rowsFetched: number;
  error?: string | null;
};

type ApiResponse = { runs?: SyncRun[] };

function statusLabel(status: string) {
  if (status === "SUCCESS") return "ناجح";
  if (status === "PARTIAL_SUCCESS") return "جزئي";
  if (status === "FAILED") return "فشل";
  if (status === "MISSING_CONFIG") return "إعداد ناقص";
  if (status === "NOT_IMPLEMENTED") return "غير مفعّل";
  if (status === "RUNNING") return "يعمل";
  return status;
}

function statusClass(status: string) {
  if (status === "SUCCESS" || status === "PARTIAL_SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function fmt(date: string) {
  try { return new Intl.DateTimeFormat("ar", { dateStyle: "short", timeStyle: "short" }).format(new Date(date)); } catch { return date; }
}

export default function MarketingSyncLogPage() {
  const [runs, setRuns] = React.useState<SyncRun[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-platform-sync/status", { cache: "no-store" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok || !json) throw new Error("failed");
      setRuns(json.runs ?? []);
    } catch {
      toast.error("تعذر تحميل سجل المزامنة");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  const failed = runs.filter((run) => run.status === "FAILED").length;
  const success = runs.filter((run) => run.status === "SUCCESS" || run.status === "PARTIAL_SUCCESS").length;
  const rows = runs.reduce((sum, run) => sum + (run.rowsFetched ?? 0), 0);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/75">Marketing Operating System</p>
          <h1 className="mt-2 text-3xl font-black">سجل المزامنة</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">آخر عمليات سحب بيانات المنصات، بدون الدخول في صفحات تقنية قديمة.</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      <Mini label="عمليات المزامنة" value={String(runs.length)} />
      <Mini label="ناجحة" value={String(success)} />
      <Mini label="فاشلة" value={String(failed)} />
    </div>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-[#025EB8]" />آخر العمليات</CardTitle><CardDescription>الصفوف المسحوبة إجمالًا: {rows}</CardDescription></CardHeader>
      <CardContent>
        {loading ? <div className="flex min-h-[12rem] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#025EB8]" /></div> : runs.length === 0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد عمليات مزامنة بعد.</div> : <div className="space-y-2">
          {runs.slice(0, 30).map((run) => <div key={run.id} className="rounded-xl border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><b>{run.platform}</b><span className="text-slate-500"> • {run.connectionName || run.accountId || "حساب"}</span></div>
              <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(run.status)}`}>{statusLabel(run.status)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">بدأت: {fmt(run.startedAt)} • الصفوف: {run.rowsFetched ?? 0}</div>
            {run.error ? <details className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700"><summary className="cursor-pointer font-bold">عرض الخطأ</summary><div className="mt-1 whitespace-pre-wrap">{run.error}</div></details> : null}
          </div>)}
        </div>}
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link href="/dashboard/marketing" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">نظام التسويق</Link><Link href="/dashboard/marketing/data-sync" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">سحب البيانات</Link><Link href="/dashboard/marketing/quality" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">جودة التتبع</Link></CardContent></Card>
  </div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div></CardContent></Card>;
}
