"use client";

import * as React from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Settings = {
  provider?: string;
  model?: string;
  keyPreview?: string | null;
  hasKey?: boolean;
  baseUrl?: string | null;
  assistantId?: string | null;
  dailyBudgetLimit?: string | null;
  enabled?: boolean;
  status?: string;
};

type ApiResponse = { ok?: boolean; settings?: Settings | null; error?: string };

export default function MarketingAiAssistantPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [provider, setProvider] = React.useState("OpenAI");
  const [model, setModel] = React.useState("gpt-4.1");
  const [keyValue, setKeyValue] = React.useState("");
  const [keyPreview, setKeyPreview] = React.useState<string | null>(null);
  const [baseUrl, setBaseUrl] = React.useState("");
  const [assistantId, setAssistantId] = React.useState("");
  const [dailyBudgetLimit, setDailyBudgetLimit] = React.useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/ai-assistant", { cache: "no-store" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      const s = json.settings;
      if (s) {
        setProvider(s.provider || "OpenAI");
        setModel(s.model || "gpt-4.1");
        setBaseUrl(s.baseUrl || "");
        setAssistantId(s.assistantId || "");
        setDailyBudgetLimit(s.dailyBudgetLimit || "");
        setKeyPreview(s.keyPreview || null);
      }
    } catch {
      toast.error("تعذر تحميل إعدادات AI Assistant");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  async function save() {
    if (!provider.trim() || !model.trim()) return toast.error("Provider و Model مطلوبان");
    if (!keyValue.trim() && !keyPreview) return toast.error("API Key مطلوب أول مرة");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, keyValue, baseUrl, assistantId, dailyBudgetLimit, enabled: true }),
      });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "failed");
      setKeyValue("");
      setKeyPreview(json.settings?.keyPreview || null);
      toast.success("تم حفظ إعدادات AI Assistant");
    } catch {
      toast.error("تعذر حفظ إعدادات AI Assistant");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">إعداد AI Assistant</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">ضع بيانات API هنا بوضوح. بعد الحفظ سيستخدمها النظام لاحقًا لتحليل بيانات التسويق وإخراج توصيات.</p>
    </div>

    {loading ? <div className="flex min-h-[16rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#025EB8]" />بيانات الاتصال</CardTitle>
          <CardDescription>هذه هي الأماكن الفعلية لإضافة إعدادات AI. يتم إخفاء المفتاح بعد الحفظ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="AI Provider" required><Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="OpenAI" /></Field>
            <Field label="Model" required><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4.1" /></Field>
            <Field label="API Key" required hint={keyPreview ? `المحفوظ حاليًا: ${keyPreview}` : "لم يتم حفظ مفتاح بعد"}><Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="ضع API Key هنا" /></Field>
            <Field label="Base URL" hint="اختياري"><Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" /></Field>
            <Field label="Assistant ID" hint="اختياري"><Input value={assistantId} onChange={(e) => setAssistantId(e.target.value)} placeholder="asst_..." /></Field>
            <Field label="Daily Budget Limit" hint="اختياري"><Input value={dailyBudgetLimit} onChange={(e) => setDailyBudgetLimit(e.target.value)} placeholder="10 USD/day" /></Field>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ إعدادات AI</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ماذا سيستخدم AI؟</CardTitle><CardDescription>بعد التفعيل الكامل سيحلل هذه المصادر.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {['الصرف والحملات', 'التبرعات وROAS', 'Google keywords/search terms', 'جودة التتبع والتحويلات'].map((item) => <div key={item} className="rounded-xl border bg-slate-50 p-3 text-sm font-semibold text-slate-800"><CheckCircle2 className="mb-2 h-4 w-4 text-[#025EB8]" />{item}</div>)}
        </CardContent>
      </Card>
    </>}

    <Card><CardHeader><CardTitle>روابط مرتبطة</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link href="/dashboard/marketing" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">نظام التسويق</Link><Link href="/dashboard/marketing/insights" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">التحليل والتوصيات</Link><Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والـ APIs</Link></CardContent></Card>
  </div>;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">{label}{required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">مطلوب</span> : null}</div>{children}{hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}</label>;
}
