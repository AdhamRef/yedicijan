"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformRow = {
  platform: string;
  connections: number;
  enabledConnections: number;
  latest: null | { status: string; startedAt: string | null; finishedAt: string | null; rowsFetched: number; error: string | null; accountId: string | null };
  lastSuccess: null | { status: string; startedAt: string | null; finishedAt: string | null; rowsFetched: number; accountId: string | null };
  lastFailure: null | { error: string | null; startedAt: string | null; accountId: string | null };
};

type ApiResponse = { ok: boolean; platforms: PlatformRow[]; totals: { platforms: number; connections: number; enabledConnections: number; successfulPlatforms: number; failingPlatforms: number } };

function fmt(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
}

function statusClass(status?: string | null) {
  if (status === "SUCCESS" || status === "PARTIAL_SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "MISSING_CONFIG") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "NOT_IMPLEMENTED") return "border-slate-200 bg-slate-50 text-slate-600";
  if (status === "RUNNING") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function PlatformSyncOverviewPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/platform-sync-summary", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل حالة مزامنة المنصات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" />العودة إلى ذكاء التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">مزامنة المنصات</h1>
        <p className="mt-1 text-sm text-slate-500">ملخص حالة مزامنة Meta وGoogle Ads وGA4 وTikTok وباقي المنصات.</p>
      </div>
      <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">المنصات</div><div className="mt-1 text-2xl font-black">{data.totals.platforms}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">الاتصالات</div><div className="mt-1 text-2xl font-black">{data.totals.connections}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">اتصالات مفعلة</div><div className="mt-1 text-2xl font-black text-emerald-700">{data.totals.enabledConnections}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">منصات بها فشل</div><div className="mt-1 text-2xl font-black text-rose-700">{data.totals.failingPlatforms}</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>حالة المنصات</CardTitle><CardDescription>هذه الصفحة تشخيصية ولا تغير أي أرقام في التقارير.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-right">المنصة</th><th className="px-3 py-2 text-right">الاتصالات</th><th className="px-3 py-2 text-right">آخر حالة</th><th className="px-3 py-2 text-right">آخر تشغيل</th><th className="px-3 py-2 text-right">آخر نجاح</th><th className="px-3 py-2 text-right">السجلات</th><th className="px-3 py-2 text-right">الخطأ</th></tr></thead><tbody>{data.platforms.map((row) => <tr key={row.platform} className="border-t"><td className="px-3 py-2 font-bold">{row.platform}</td><td className="px-3 py-2">{row.enabledConnections}/{row.connections}</td><td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(row.latest?.status)}`}>{row.latest?.status ?? "—"}</span></td><td className="px-3 py-2">{fmt(row.latest?.startedAt)}</td><td className="px-3 py-2">{fmt(row.lastSuccess?.finishedAt ?? row.lastSuccess?.startedAt)}</td><td className="px-3 py-2">{row.latest?.rowsFetched ?? 0}</td><td className="max-w-[24rem] truncate px-3 py-2 text-xs text-rose-700">{row.latest?.error || row.lastFailure?.error || "—"}</td></tr>)}</tbody></table></div></CardContent></Card>
    </>}
  </div>;
}
