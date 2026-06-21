"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingPageHeader } from "../_components/MarketingPageHeader";
import { MarketingQuickNav } from "../_components/MarketingQuickNav";

type PlatformHealth = { platform: string; label: string; ready: boolean; missing: string[] };
type RecentEvent = { platform?: string; channel?: string; eventName?: string; status?: string; error?: string };
type Health = {
  scores: { readiness: number; delivery: number; overall: number };
  platforms: PlatformHealth[];
  donations: { paidLast7d: number; missingServerConversions: number };
  conversionEvents: { failedLast7d: number; recent: RecentEvent[] };
};

const tools = [
  { title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center", desc: "إعادة فحص وإرسال التحويلات الناقصة." },
  { title: "أحداث التحويل", href: "/dashboard/conversion-events", desc: "سجل الإرسال والفشل لكل منصة." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", desc: "مقارنة التبرعات الحقيقية مع أرقام المنصات." },
  { title: "إعدادات البكسلات", href: "/dashboard/pixels", desc: "Meta وGA4 وGoogle وTikTok وX." },
];

function scoreTone(value: number) {
  if (value >= 80) return "text-emerald-700";
  if (value >= 50) return "text-amber-700";
  return "text-rose-700";
}

export default function MarketingQualityPage() {
  const [data, setData] = React.useState<Health | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/health", { cache: "no-store" });
      const json = await res.json().catch(() => null) as Health | null;
      if (!res.ok || !json?.scores) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل جودة التتبع");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  const missingPlatforms = data?.platforms.filter((platform) => !platform.ready) ?? [];
  const failedEvents = data?.conversionEvents.recent.filter((event) => event.status === "FAILED").slice(0, 4) ?? [];

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <MarketingPageHeader
      title="جودة التتبع والإصلاح"
      description="اعرف بسرعة هل التتبع سليم، وما الذي يحتاج إصلاحًا الآن قبل اتخاذ قرارات ميزانية أو تقييم أداء."
      actions={<Button variant="secondary" onClick={load} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button>}
    />

    <MarketingQuickNav />

    {loading ? <div className="flex min-h-[18rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-sm text-slate-500">لا توجد بيانات جودة متاحة.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="الصحة العامة" value={`${data.scores.overall}%`} className={scoreTone(data.scores.overall)} />
        <Kpi label="جاهزية المنصات" value={`${data.scores.readiness}%`} className={scoreTone(data.scores.readiness)} />
        <Kpi label="تسليم التحويلات" value={`${data.scores.delivery}%`} className={scoreTone(data.scores.delivery)} />
        <Kpi label="تحويلات ناقصة" value={String(data.donations.missingServerConversions)} className={data.donations.missingServerConversions > 0 ? "text-rose-700" : "text-emerald-700"} />
        <Kpi label="أحداث فاشلة" value={String(data.conversionEvents.failedLast7d)} className={data.conversionEvents.failedLast7d > 0 ? "text-rose-700" : "text-emerald-700"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>ما الذي يحتاج إصلاح؟</CardTitle><CardDescription>المشاكل المهمة فقط.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {missingPlatforms.length === 0 && data.donations.missingServerConversions === 0 && data.conversionEvents.failedLast7d === 0 ? <Notice tone="good" title="التتبع مستقر" body="لا توجد مشاكل حرجة ظاهرة الآن." /> : null}
            {missingPlatforms.length ? <Notice tone="warn" title="منصات ناقصة الإعداد" body={`${missingPlatforms.length} منصة تحتاج استكمال إعدادات.`} /> : null}
            {data.donations.missingServerConversions > 0 ? <Notice tone="bad" title="تحويلات ناقصة" body={`${data.donations.missingServerConversions} تبرع يحتاج فحص أو إعادة إرسال.`} /> : null}
            {data.conversionEvents.failedLast7d > 0 ? <Notice tone="bad" title="أحداث فاشلة" body={`${data.conversionEvents.failedLast7d} حدث تحويل فشل آخر 7 أيام.`} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>المنصات الناقصة</CardTitle><CardDescription>افتح إعداد البكسلات أو الربط عند الحاجة فقط.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {missingPlatforms.length === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-4 w-4" />كل المنصات الأساسية جاهزة.</div> : missingPlatforms.map((platform) => <div key={platform.platform} className="rounded-xl border bg-amber-50 p-3 text-sm text-amber-800"><div className="font-bold">{platform.label}</div>{platform.missing.length ? <div className="mt-1 text-xs">ناقص: {platform.missing.join(", ")}</div> : null}</div>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>آخر الأحداث الفاشلة</CardTitle><CardDescription>مختصر للفشل فقط. السجل الكامل داخل أحداث التحويل.</CardDescription></CardHeader>
        <CardContent>
          {failedEvents.length === 0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">لا توجد أحداث فاشلة حديثة.</div> : <div className="grid gap-2 md:grid-cols-2">{failedEvents.map((event, index) => <div key={`${event.platform}-${index}`} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{event.platform || "منصة"}</b><span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">فشل</span></div><div className="mt-1 text-xs text-slate-500">{event.eventName || "حدث"}</div>{event.error ? <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{event.error}</div> : null}</div>)}</div>}
        </CardContent>
      </Card>
    </>}

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[#025EB8]" />أدوات الإصلاح</CardTitle><CardDescription>افتحها فقط عند الحاجة.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => <Link key={tool.href} href={tool.href} className="rounded-xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"><div className="font-bold text-slate-900">{tool.title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{tool.desc}</p><span className="mt-3 inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح</span></Link>)}
      </CardContent>
    </Card>
  </div>;
}

function Kpi({ label, value, className }: { label: string; value: string; className?: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className={`mt-2 text-2xl font-black ${className || "text-slate-950"}`}>{value}</div></CardContent></Card>; }
function Notice({ title, body, tone }: { title: string; body: string; tone: "good" | "warn" | "bad" }) { const cls = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"; const Icon = tone === "good" ? CheckCircle2 : AlertTriangle; return <div className={`rounded-xl border p-3 ${cls}`}><div className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4" />{title}</div><div className="mt-1 text-sm leading-6">{body}</div></div>; }
