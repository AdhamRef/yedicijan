"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  id: string;
  platform: string;
  campaignId: string | null;
  campaignName: string | null;
  currency: string;
  platformMetrics: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number; roas: number };
  siteMetrics: { donations: number; revenue: number; roas: number; matchQuality: { strong: number; medium: number; weak: number } };
  gaps: { donationGap: number; revenueGap: number; roasGap: number };
  verdict: { tone: "good" | "warning" | "danger" | "neutral"; label: string; action: string };
};

type ApiResponse = {
  ok: boolean;
  range: { from: string; to: string; days: number };
  platform: string;
  summary: { spend: number; platformConversions: number; platformRevenue: number; siteDonations: number; siteRevenue: number; platformRoas: number; siteRoas: number; donationGap: number; revenueGap: number };
  rows: Row[];
};

function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }
function toneClass(tone: string) { if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-800"; if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-800"; if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800"; return "border-slate-200 bg-slate-50 text-slate-700"; }

export default function SiteVsPlatformPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [platform, setPlatform] = React.useState("ALL");
  const [days, setDays] = React.useState(7);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, days: String(days) });
      const res = await fetch(`/api/admin/marketing-intelligence/site-vs-platform?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل مقارنة الموقع والمنصات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [platform, days]);

  React.useEffect(() => { void load(); }, [load]);

  function exportCsv() {
    const params = new URLSearchParams({ platform, days: String(days) });
    window.open(`/api/admin/marketing-intelligence/site-vs-platform/export?${params.toString()}`, "_blank");
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">مقارنة الموقع ضد المنصات</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">تقارن بين بيانات المنصات المستوردة وبين تبرعات الموقع المطابقة عبر campaign/ad identifiers.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="ALL">كل المنصات</option><option value="META">Meta</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK">TikTok</option><option value="X">X</option><option value="GA4">GA4</option></select>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border bg-white px-3 py-2 text-sm"><option value={1}>اليوم</option><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يوم</option><option value={90}>آخر 90 يوم</option></select>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" />تصدير CSV</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Kpi label="Spend" value={money(data.summary.spend)} />
        <Kpi label="Platform Conv." value={money(data.summary.platformConversions)} />
        <Kpi label="Site Donations" value={money(data.summary.siteDonations)} />
        <Kpi label="Platform ROAS" value={`${data.summary.platformRoas.toFixed(2)}x`} />
        <Kpi label="Site ROAS" value={`${data.summary.siteRoas.toFixed(2)}x`} />
        <Kpi label="Donation Gap" value={money(data.summary.donationGap)} />
      </div>

      <Card>
        <CardHeader><CardTitle>نتائج المقارنة</CardTitle><CardDescription>الفترة: {data.range.from} — {data.range.to}. أدخل أو استورد بيانات المنصات أولًا حتى تظهر المقارنات.</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-right">الحملة</th><th className="px-3 py-2 text-right">المنصة</th><th className="px-3 py-2 text-right">Spend</th><th className="px-3 py-2 text-right">منصة Conv/Rev</th><th className="px-3 py-2 text-right">موقع Donations/Rev</th><th className="px-3 py-2 text-right">الفجوة</th><th className="px-3 py-2 text-right">الحكم</th></tr></thead><tbody>{data.rows.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">لا توجد بيانات منصة للمقارنة. افتح استيراد بيانات المنصات وأضف CSV.</td></tr> : data.rows.map((row) => <tr key={row.id} className="border-t align-top"><td className="px-3 py-2"><div className="font-bold">{row.campaignName || row.campaignId || "—"}</div><div className="font-mono text-xs text-slate-400">{row.campaignId || ""}</div></td><td className="px-3 py-2">{row.platform}</td><td className="px-3 py-2">{money(row.platformMetrics.spend)} {row.currency}</td><td className="px-3 py-2"><div>{row.platformMetrics.conversions} تحويل</div><div>{money(row.platformMetrics.revenue)} {row.currency}</div><div className="text-xs text-slate-400">ROAS {row.platformMetrics.roas.toFixed(2)}x</div></td><td className="px-3 py-2"><div>{row.siteMetrics.donations} تبرع</div><div>{money(row.siteMetrics.revenue)} USD</div><div className="text-xs text-slate-400">ROAS {row.siteMetrics.roas.toFixed(2)}x</div></td><td className="px-3 py-2"><div>تبرعات: {row.gaps.donationGap}</div><div>إيراد: {money(row.gaps.revenueGap)}</div></td><td className="min-w-[15rem] px-3 py-2"><div className={`rounded-lg border p-2 text-xs ${toneClass(row.verdict.tone)}`}>{row.verdict.tone === "good" ? <CheckCircle2 className="mb-1 h-4 w-4" /> : <AlertTriangle className="mb-1 h-4 w-4" />}<b>{row.verdict.label}</b><div className="mt-1 leading-5">{row.verdict.action}</div></div></td></tr>)}</tbody></table></div>
        </CardContent>
      </Card>
    </>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></CardContent></Card>; }
