"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LinkHealthRow = {
  id: string;
  name: string;
  platform: string | null;
  url: string | null;
  health: { score: number; status: "healthy" | "needs_review" | "poor"; warnings: string[]; fixes: string[] };
};

type ApiResponse = {
  ok: boolean;
  summary: { links: number; healthy: number; needsReview: number; poor: number; averageScore: number };
  links: LinkHealthRow[];
};

function statusLabel(status: LinkHealthRow["health"]["status"]) {
  if (status === "healthy") return "سليم";
  if (status === "needs_review") return "يحتاج مراجعة";
  return "ضعيف";
}

function statusClass(status: LinkHealthRow["health"]["status"]) {
  if (status === "healthy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "needs_review") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default function CampaignLinksHealthPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [platform, setPlatform] = React.useState("META");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (platform !== "ALL") params.set("platform", platform);
      const res = await fetch(`/api/admin/marketing-intelligence/campaign-links/health?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل صحة روابط الحملات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" />العودة إلى ذكاء التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">صحة روابط الحملات</h1>
        <p className="mt-1 text-sm text-slate-500">فحص جودة روابط Campaign Registry قبل الاعتماد عليها في الإسناد.</p>
      </div>
      <div className="flex gap-2">
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="META">Meta</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK">TikTok</option><option value="X">X</option><option value="ALL">كل المنصات</option></select>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">الروابط</div><div className="mt-1 text-2xl font-black">{data.summary.links}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">متوسط الصحة</div><div className="mt-1 text-2xl font-black">{data.summary.averageScore}/100</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">سليم</div><div className="mt-1 text-2xl font-black text-emerald-700">{data.summary.healthy}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">يحتاج مراجعة</div><div className="mt-1 text-2xl font-black text-amber-700">{data.summary.needsReview}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">ضعيف</div><div className="mt-1 text-2xl font-black text-rose-700">{data.summary.poor}</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>الروابط حسب أولوية الإصلاح</CardTitle><CardDescription>الأضعف يظهر أولًا.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-right">الرابط</th><th className="px-3 py-2 text-right">المنصة</th><th className="px-3 py-2 text-right">الصحة</th><th className="px-3 py-2 text-right">التحذيرات</th><th className="px-3 py-2 text-right">الإصلاح</th></tr></thead><tbody>{data.links.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">لا توجد روابط محفوظة.</td></tr> : data.links.map((row) => <tr key={row.id} className="border-t"><td className="max-w-[24rem] px-3 py-2"><div className="font-semibold">{row.name}</div><div className="truncate text-xs text-slate-400">{row.url || "—"}</div></td><td className="px-3 py-2">{row.platform || "—"}</td><td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(row.health.status)}`}>{statusLabel(row.health.status)} · {row.health.score}/100</span></td><td className="max-w-[18rem] px-3 py-2 text-xs text-amber-700">{row.health.warnings.join("، ") || "—"}</td><td className="max-w-[22rem] px-3 py-2 text-xs text-slate-600">{row.health.fixes[0] || "—"}</td></tr>)}</tbody></table></div></CardContent></Card>
    </>}
  </div>;
}
