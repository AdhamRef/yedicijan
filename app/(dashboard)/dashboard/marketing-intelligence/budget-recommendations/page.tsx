"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Download, History, Loader2, RefreshCw, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Recommendation = {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  decision: "SCALE" | "HOLD" | "REDUCE" | "PAUSE" | "FIX_TRACKING" | "REVIEW";
  title: string;
  reason: string;
  action: string;
  href: string;
  metrics: {
    spend?: number;
    siteRevenue?: number;
    siteRoas?: number;
    platformRoas?: number;
    siteDonations?: number;
    platformConversions?: number;
    donationGap?: number;
    dataQuality?: { score: number; warnings: string[]; matchQuality?: { strong: number; medium: number; weak: number } };
  };
};

type ApiResponse = {
  ok: boolean;
  summary: { total: number; scale: number; pause: number; reduce: number; fixTracking: number; spend: number; siteRevenue: number; siteRoas: number; avgDataQuality?: number };
  recommendations: Recommendation[];
};

function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"; }
function decisionLabel(decision: Recommendation["decision"]) { if (decision === "SCALE") return "زود"; if (decision === "PAUSE") return "أوقف"; if (decision === "REDUCE") return "خفّض"; if (decision === "FIX_TRACKING") return "أصلح التتبع"; if (decision === "HOLD") return "ثبّت"; return "راجع"; }
function decisionClass(decision: Recommendation["decision"]) { if (decision === "SCALE") return "border-emerald-200 bg-emerald-50 text-emerald-800"; if (decision === "PAUSE" || decision === "REDUCE") return "border-rose-200 bg-rose-50 text-rose-800"; if (decision === "FIX_TRACKING") return "border-amber-200 bg-amber-50 text-amber-800"; return "border-slate-200 bg-slate-50 text-slate-700"; }
function qualityClass(score: number) { if (score >= 75) return "text-emerald-700 bg-emerald-50 border-emerald-200"; if (score >= 55) return "text-amber-700 bg-amber-50 border-amber-200"; return "text-rose-700 bg-rose-50 border-rose-200"; }
function icon(decision: Recommendation["decision"]) { if (decision === "SCALE") return <TrendingUp className="h-4 w-4" />; if (decision === "PAUSE" || decision === "REDUCE") return <TrendingDown className="h-4 w-4" />; if (decision === "FIX_TRACKING") return <Wrench className="h-4 w-4" />; if (decision === "HOLD") return <CheckCircle2 className="h-4 w-4" />; return <AlertTriangle className="h-4 w-4" />; }

export default function BudgetRecommendationsPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loggingId, setLoggingId] = React.useState<string | null>(null);
  const [platform, setPlatform] = React.useState("ALL");
  const [days, setDays] = React.useState(7);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, days: String(days) });
      const res = await fetch(`/api/admin/marketing-intelligence/budget-recommendations?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل توصيات الميزانية");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [platform, days]);

  React.useEffect(() => { void load(); }, [load]);

  function exportCsv() {
    const params = new URLSearchParams({ platform, days: String(days) });
    window.open(`/api/admin/marketing-intelligence/budget-recommendations/export?${params.toString()}`, "_blank");
  }

  async function logDecision(rec: Recommendation) {
    setLoggingId(rec.id);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/budget-decision-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRecommendationId: rec.id, decision: rec.decision, title: rec.title, reason: rec.reason, action: rec.action, metrics: rec.metrics, status: "IMPLEMENTED" }),
      });
      const json = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "failed");
      toast.success("تم تسجيل القرار في السجل");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل القرار");
    } finally {
      setLoggingId(null);
    }
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">توصيات التشغيل والميزانية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">قرارات عملية مبنية على مقارنة بيانات المنصات مع تبرعات الموقع، مع درجة جودة بيانات تمنع التوسع عند ضعف الإسناد.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="ALL">كل المنصات</option><option value="META">Meta</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK">TikTok</option><option value="X">X</option><option value="GA4">GA4</option></select>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border bg-white px-3 py-2 text-sm"><option value={1}>اليوم</option><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يوم</option><option value={90}>آخر 90 يوم</option></select>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" />تصدير CSV</Button>
        <Link href="/dashboard/marketing-intelligence/budget-decisions" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"><History className="h-4 w-4" />سجل القرارات</Link>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7"><Kpi label="إجمالي" value={String(data.summary.total)} /><Kpi label="زود" value={String(data.summary.scale)} /><Kpi label="أوقف" value={String(data.summary.pause)} /><Kpi label="خفّض" value={String(data.summary.reduce)} /><Kpi label="أصلح التتبع" value={String(data.summary.fixTracking)} /><Kpi label="Site ROAS" value={`${data.summary.siteRoas.toFixed(2)}x`} /><Kpi label="جودة البيانات" value={`${data.summary.avgDataQuality || 0}/100`} /></div>
      <Card><CardHeader><CardTitle>قائمة القرارات</CardTitle><CardDescription>لا يتم اقتراح زيادة الميزانية إلا عند وجود جودة بيانات كافية وتطابق مقبول بين الموقع والمنصة.</CardDescription></CardHeader><CardContent className="space-y-3">{data.recommendations.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد توصيات بعد. أدخل أو استورد بيانات المنصات أولًا.</div> : data.recommendations.map((rec) => {
        const quality = rec.metrics.dataQuality?.score || 0;
        const warnings = rec.metrics.dataQuality?.warnings || [];
        return <div key={rec.id} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-4xl"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${decisionClass(rec.decision)}`}>{icon(rec.decision)}{decisionLabel(rec.decision)}</span><span className={`rounded-full border px-2 py-1 text-xs font-bold ${qualityClass(quality)}`}>جودة البيانات {quality}/100</span></div><h2 className="mt-2 text-base font-bold text-slate-950">{rec.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{rec.reason}</p><div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><b>الإجراء:</b> {rec.action}</div>{warnings.length ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><b>تنبيهات الجودة:</b> {warnings.join("، ")}</div> : null}<div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500"><span>Spend: {money(rec.metrics.spend)}</span><span>Site Revenue: {money(rec.metrics.siteRevenue)}</span><span>Site ROAS: {(rec.metrics.siteRoas || 0).toFixed(2)}x</span><span>Platform ROAS: {(rec.metrics.platformRoas || 0).toFixed(2)}x</span><span>تبرعات الموقع: {rec.metrics.siteDonations || 0}</span><span>تحويلات المنصة: {rec.metrics.platformConversions || 0}</span></div></div><div className="flex flex-col gap-2"><Link href={rec.href} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح المصدر</Link><Button variant="outline" onClick={() => void logDecision(rec)} disabled={loggingId === rec.id} className="gap-2">{loggingId === rec.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}تم التنفيذ</Button></div></div></div>;
      })}</CardContent></Card>
    </>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></CardContent></Card>; }
