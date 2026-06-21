"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, History, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DecisionRow = {
  _id?: { $oid?: string } | string;
  sourceRecommendationId?: string | null;
  decision: string;
  title: string;
  reason: string;
  action: string;
  status?: string;
  createdBy?: string | null;
  createdAt?: string | { $date?: string };
  metrics?: { spend?: number; siteRevenue?: number; siteRoas?: number; platformRoas?: number; siteDonations?: number; platformConversions?: number; dataQuality?: { score?: number } };
};

type ApiResponse = { ok: boolean; rows: DecisionRow[] };

function dateText(value: DecisionRow["createdAt"]) {
  const raw = typeof value === "string" ? value : value?.$date;
  if (!raw) return "—";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
}
function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"; }
function decisionLabel(value: string) { if (value === "SCALE") return "زود"; if (value === "PAUSE") return "أوقف"; if (value === "REDUCE") return "خفّض"; if (value === "FIX_TRACKING") return "أصلح التتبع"; if (value === "HOLD") return "ثبّت"; return value || "—"; }
function decisionClass(value: string) { if (value === "SCALE") return "border-emerald-200 bg-emerald-50 text-emerald-800"; if (value === "PAUSE" || value === "REDUCE") return "border-rose-200 bg-rose-50 text-rose-800"; if (value === "FIX_TRACKING") return "border-amber-200 bg-amber-50 text-amber-800"; return "border-slate-200 bg-slate-50 text-slate-700"; }

export default function BudgetDecisionLogPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/budget-decision-log?limit=100", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل سجل قرارات الميزانية");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence/budget-recommendations" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى توصيات الميزانية</Link>
        <h1 className="text-2xl font-black text-slate-950">سجل قرارات الميزانية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">يسجل قرارات الفريق بعد تنفيذ توصيات زود/أوقف/خفّض/أصلح التتبع، حتى يمكن مراجعة أثرها لاحقًا.</p>
      </div>
      <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-[#025EB8]" />آخر القرارات</CardTitle><CardDescription>آخر 100 قرار مسجل.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {data.rows.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد قرارات مسجلة بعد.</div> : data.rows.map((row, index) => <div key={String(typeof row._id === "string" ? row._id : row._id?.$oid || index)} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-4xl">
              <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${decisionClass(row.decision)}`}>{decisionLabel(row.decision)}</span>
              <h2 className="mt-2 font-bold text-slate-950">{row.title || "قرار ميزانية"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{row.reason}</p>
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><b>الإجراء المنفذ:</b> {row.action}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>التاريخ: {dateText(row.createdAt)}</span>
                <span>بواسطة: {row.createdBy || "—"}</span>
                <span>Spend: {money(row.metrics?.spend)}</span>
                <span>Site ROAS: {(row.metrics?.siteRoas || 0).toFixed(2)}x</span>
                <span>Quality: {row.metrics?.dataQuality?.score || 0}/100</span>
              </div>
            </div>
          </div>
        </div>)}
      </CardContent>
    </Card>}
  </div>;
}
