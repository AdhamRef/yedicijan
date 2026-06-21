"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Copy, Loader2, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const templates: Record<string, { label: string; level: string; sample: string; hints: string[] }> = {
  META: {
    label: "Meta Ads",
    level: "CAMPAIGN",
    sample: "date,campaign_id,campaign_name,spend,impressions,clicks,conversions,revenue\n2026-06-01,123456789,Gaza Donation Campaign,120.50,15000,420,8,640",
    hints: ["صدّر من Ads Manager حسب اليوم والحملة.", "استخدم أعمدة Amount spent, Impressions, Link clicks, Website purchases, Purchase conversion value.", "تأكد من وجود Campaign ID أو Campaign Name."],
  },
  GOOGLE_ADS: {
    label: "Google Ads",
    level: "CAMPAIGN",
    sample: "date,campaign_id,campaign_name,cost,impressions,clicks,conversions,conversion value\n2026-06-01,987654321,Search Donations,95.20,8000,310,5,410",
    hints: ["استخدم Cost وليس Cost micros عند التصدير العادي.", "لو التقرير يحتوي cost_micros فالنظام سيحوّله تلقائيًا بقسمة 1,000,000.", "يفضل تضمين Campaign ID للتحليل الدقيق."],
  },
  TIKTOK: {
    label: "TikTok Ads",
    level: "CAMPAIGN",
    sample: "date,campaign_id,campaign_name,spend,impressions,clicks,conversions,revenue\n2026-06-01,tt_123,Ramadan Donations,70,22000,510,4,260",
    hints: ["صدّر Campaign report يوميًا.", "استخدم Spend, Impressions, Clicks, Conversions, Total revenue إن وجدت.", "أضف campaign_id في الروابط التسويقية للمطابقة."],
  },
  GA4: {
    label: "GA4",
    level: "SOURCE",
    sample: "date,source,medium,campaign,clicks,purchases,total revenue\n2026-06-01,facebook,paid_social,Gaza Donation Campaign,420,8,640",
    hints: ["استخدم Traffic acquisition أو campaign report.", "GA4 مفيد للمقارنة وليس بديلًا عن بيانات الإنفاق.", "يفضل إدخال Source/Medium/Campaign."],
  },
};

export default function PlatformMetricsImportPage() {
  const [csv, setCsv] = React.useState("");
  const [platform, setPlatform] = React.useState("META");
  const [level, setLevel] = React.useState("CAMPAIGN");
  const [loading, setLoading] = React.useState(false);

  const activeTemplate = templates[platform] || templates.META;

  function useTemplate(nextPlatform: string) {
    const template = templates[nextPlatform] || templates.META;
    setPlatform(nextPlatform);
    setLevel(template.level);
    setCsv(template.sample);
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(activeTemplate.sample).catch(() => null);
    toast.success("تم نسخ نموذج CSV");
  }

  async function importCsv() {
    if (!csv.trim()) return toast.error("الصق CSV أولًا");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/platform-metrics/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, platform, level }),
      });
      const json = await res.json().catch(() => null) as { ok?: boolean; imported?: number; skipped?: number; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "import failed");
      toast.success(`تم استيراد ${json.imported || 0} صف`);
      setCsv("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الاستيراد");
    } finally {
      setLoading(false);
    }
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div>
      <Link href="/dashboard/marketing-intelligence/platform-metrics" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى بيانات المنصات</Link>
      <h1 className="text-2xl font-black text-slate-950">استيراد CSV لبيانات المنصات</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">الصق تقرير CSV من منصة الإعلانات وسيتم تحويله إلى بيانات موحدة. اختر قالب المنصة أولًا لتقليل الأخطاء.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>قوالب CSV جاهزة</CardTitle>
        <CardDescription>اختر المنصة لعرض مثال الأعمدة وطريقة التصدير المقترحة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Object.entries(templates).map(([key, template]) => <Button key={key} type="button" variant={platform === key ? "default" : "outline"} onClick={() => useTemplate(key)}>{template.label}</Button>)}
        </div>
        <div className="rounded-xl border bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><div className="font-bold text-slate-950">{activeTemplate.label}</div><div className="mt-1 text-xs text-slate-500">المستوى المقترح: {activeTemplate.level}</div></div>
            <Button variant="outline" size="sm" onClick={copyTemplate} className="gap-2"><Copy className="h-4 w-4" />نسخ النموذج</Button>
          </div>
          <ul className="mt-3 list-disc space-y-1 pr-5 text-sm leading-6 text-slate-600">{activeTemplate.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-[#025EB8]" />استيراد البيانات</CardTitle>
        <CardDescription>أعمدة مدعومة مثل: date, campaign_id, campaign_name, spend, impressions, clicks, conversions, revenue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
            <option value="META">Meta</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK">TikTok</option><option value="X">X</option><option value="GA4">GA4</option><option value="OTHER">Other</option>
          </select>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
            <option value="ACCOUNT">Account</option><option value="CAMPAIGN">Campaign</option><option value="ADSET">Adset / Ad Group</option><option value="AD">Ad</option><option value="SOURCE">Source</option>
          </select>
        </div>
        <textarea value={csv} onChange={(event) => setCsv(event.target.value)} dir="ltr" rows={16} placeholder="date,campaign_id,campaign_name,spend,impressions,clicks,conversions,revenue" className="w-full rounded-xl border bg-white p-4 text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={importCsv} disabled={loading} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}استيراد CSV</Button>
          <Link href="/dashboard/marketing-intelligence/platform-metrics" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">عرض البيانات</Link>
        </div>
      </CardContent>
    </Card>
  </div>;
}
