"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Database, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MetricRow = {
  metricKey?: string;
  platform: string;
  level: string;
  date: string;
  campaignId?: string | null;
  campaignName?: string | null;
  adsetId?: string | null;
  adsetName?: string | null;
  adId?: string | null;
  adName?: string | null;
  currency: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
};

type ApiResponse = {
  ok: boolean;
  rows: MetricRow[];
  summary: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number; roas: number; cpa: number };
};

type FormState = {
  platform: string;
  level: string;
  date: string;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
  currency: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  revenue: string;
};

function today() { return new Date().toISOString().slice(0, 10); }
function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"; }
function percent(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "—"; }

const emptyForm = (): FormState => ({ platform: "META", level: "CAMPAIGN", date: today(), campaignId: "", campaignName: "", adsetId: "", adsetName: "", adId: "", adName: "", currency: "USD", spend: "", impressions: "", clicks: "", conversions: "", revenue: "" });

export default function PlatformMetricsPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [platform, setPlatform] = React.useState("ALL");
  const [level, setLevel] = React.useState("ALL");
  const [form, setForm] = React.useState<FormState>(emptyForm);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (platform !== "ALL") params.set("platform", platform);
      if (level !== "ALL") params.set("level", level);
      const res = await fetch(`/api/admin/marketing-intelligence/platform-metrics?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل بيانات المنصات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [platform, level]);

  React.useEffect(() => { void load(); }, [load]);

  async function saveMetric() {
    setSaving(true);
    try {
      const body = {
        platform: form.platform,
        level: form.level,
        date: form.date,
        campaignId: form.campaignId,
        campaignName: form.campaignName,
        adsetId: form.adsetId,
        adsetName: form.adsetName,
        adId: form.adId,
        adName: form.adName,
        currency: form.currency,
        spend: Number(form.spend || 0),
        impressions: Number(form.impressions || 0),
        clicks: Number(form.clicks || 0),
        conversions: Number(form.conversions || 0),
        revenue: Number(form.revenue || 0),
      };
      const res = await fetch("/api/admin/marketing-intelligence/platform-metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "save failed");
      toast.success("تم حفظ بيانات المنصة");
      setForm(emptyForm());
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">بيانات المنصات الإعلانية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">طبقة موحدة لتخزين وقراءة إنفاق ونتائج Meta / Google Ads / TikTok / X / GA4. هذه هي قاعدة المقارنة القادمة بين المنصات والموقع.</p>
      </div>
      <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[22rem_1fr]">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-[#025EB8]" />إدخال يدوي سريع</CardTitle><CardDescription>مؤقتًا حتى يتم ربط API المنصات الحقيقي.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="المنصة" value={form.platform} onChange={(value) => setForm({ ...form, platform: value })} options={["META", "GOOGLE_ADS", "TIKTOK", "X", "GA4", "OTHER"]} />
            <SelectField label="المستوى" value={form.level} onChange={(value) => setForm({ ...form, level: value })} options={["ACCOUNT", "CAMPAIGN", "ADSET", "AD", "SOURCE"]} />
          </div>
          <InputField label="التاريخ" value={form.date} onChange={(value) => setForm({ ...form, date: value })} dir="ltr" />
          <InputField label="Campaign ID" value={form.campaignId} onChange={(value) => setForm({ ...form, campaignId: value })} dir="ltr" />
          <InputField label="Campaign Name" value={form.campaignName} onChange={(value) => setForm({ ...form, campaignName: value })} />
          <InputField label="Adset / AdGroup ID" value={form.adsetId} onChange={(value) => setForm({ ...form, adsetId: value })} dir="ltr" />
          <InputField label="Ad ID" value={form.adId} onChange={(value) => setForm({ ...form, adId: value })} dir="ltr" />
          <div className="grid grid-cols-2 gap-2">
            <InputField label="Spend" value={form.spend} onChange={(value) => setForm({ ...form, spend: value })} dir="ltr" />
            <InputField label="Revenue" value={form.revenue} onChange={(value) => setForm({ ...form, revenue: value })} dir="ltr" />
            <InputField label="Impressions" value={form.impressions} onChange={(value) => setForm({ ...form, impressions: value })} dir="ltr" />
            <InputField label="Clicks" value={form.clicks} onChange={(value) => setForm({ ...form, clicks: value })} dir="ltr" />
            <InputField label="Conversions" value={form.conversions} onChange={(value) => setForm({ ...form, conversions: value })} dir="ltr" />
            <InputField label="Currency" value={form.currency} onChange={(value) => setForm({ ...form, currency: value.toUpperCase() })} dir="ltr" />
          </div>
          <Button onClick={saveMetric} disabled={saving} className="w-full gap-2"><Database className="h-4 w-4" />حفظ البيانات</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-3">
          <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="ALL">كل المنصات</option><option value="META">Meta</option><option value="GOOGLE_ADS">Google Ads</option><option value="TIKTOK">TikTok</option><option value="X">X</option><option value="GA4">GA4</option></select>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="ALL">كل المستويات</option><option value="ACCOUNT">Account</option><option value="CAMPAIGN">Campaign</option><option value="ADSET">Adset</option><option value="AD">Ad</option><option value="SOURCE">Source</option></select>
        </div>

        {loading ? <div className="flex min-h-[18rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Kpi label="Spend" value={money(data.summary.spend)} />
            <Kpi label="Revenue" value={money(data.summary.revenue)} />
            <Kpi label="ROAS" value={`${data.summary.roas.toFixed(2)}x`} />
            <Kpi label="CPA" value={money(data.summary.cpa)} />
            <Kpi label="Clicks" value={money(data.summary.clicks)} />
            <Kpi label="Conversions" value={money(data.summary.conversions)} />
          </div>
          <Card>
            <CardHeader><CardTitle>السجلات</CardTitle><CardDescription>آخر 200 سجل حسب الفلاتر.</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-right">التاريخ</th><th className="px-3 py-2 text-right">المنصة</th><th className="px-3 py-2 text-right">المستوى</th><th className="px-3 py-2 text-right">الحملة/الإعلان</th><th className="px-3 py-2 text-right">Spend</th><th className="px-3 py-2 text-right">Clicks</th><th className="px-3 py-2 text-right">Conv.</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">ROAS</th><th className="px-3 py-2 text-right">CTR</th></tr></thead><tbody>{data.rows.length === 0 ? <tr><td colSpan={10} className="p-8 text-center text-slate-500">لا توجد بيانات بعد.</td></tr> : data.rows.map((row, index) => <tr key={row.metricKey || index} className="border-t"><td className="px-3 py-2">{row.date}</td><td className="px-3 py-2">{row.platform}</td><td className="px-3 py-2">{row.level}</td><td className="px-3 py-2"><div className="font-medium">{row.campaignName || row.adName || row.campaignId || row.adId || "—"}</div><div className="font-mono text-xs text-slate-400">{row.campaignId || row.adId || ""}</div></td><td className="px-3 py-2">{money(row.spend)} {row.currency}</td><td className="px-3 py-2">{money(row.clicks)}</td><td className="px-3 py-2">{money(row.conversions)}</td><td className="px-3 py-2">{money(row.revenue)} {row.currency}</td><td className="px-3 py-2 font-bold">{row.roas.toFixed(2)}x</td><td className="px-3 py-2">{percent(row.ctr)}</td></tr>)}</tbody></table></div>
            </CardContent>
          </Card>
        </>}
      </div>
    </div>
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></CardContent></Card>; }
function InputField({ label, value, onChange, dir }: { label: string; value: string; onChange: (value: string) => void; dir?: "ltr" | "rtl" }) { return <div className="space-y-1"><label className="text-xs text-slate-500">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} dir={dir || "rtl"} className="w-full rounded-md border bg-white px-3 py-2 text-sm" /></div>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <div className="space-y-1"><label className="text-xs text-slate-500">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border bg-white px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>; }
