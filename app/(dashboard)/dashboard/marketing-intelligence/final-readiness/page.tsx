"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingWorkflowHeader } from "../_components/MarketingWorkflowHeader";

type Check = {
  id: string;
  title: string;
  status: "PASS" | "WARN" | "FAIL";
  description: string;
  action: string;
  href: string;
  value?: number | string;
};

type ApiResponse = {
  ok: boolean;
  generatedAt: string;
  score: number;
  summary: { total: number; passed: number; warning: number; failed: number };
  checks: Check[];
};

function statusClass(status: Check["status"]) {
  if (status === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "FAIL") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}
function statusIcon(status: Check["status"]) {
  if (status === "PASS") return <CheckCircle2 className="h-5 w-5" />;
  if (status === "FAIL") return <XCircle className="h-5 w-5" />;
  return <AlertTriangle className="h-5 w-5" />;
}
function statusLabel(status: Check["status"]) {
  if (status === "PASS") return "جاهز";
  if (status === "FAIL") return "خلل";
  return "يحتاج انتباه";
}
function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 55) return "text-amber-700";
  return "text-rose-700";
}

export default function FinalReadinessPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/final-readiness", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل فحص جاهزية النظام");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <MarketingWorkflowHeader
      current="الفحص النهائي"
      title="الفحص النهائي لنظام التتبع والإعلانات"
      description="شاشة واحدة لتأكيد جاهزية النظام بعد الـ deploy: الهيكلة، الإعدادات، بيانات المنصات، التحويلات، التبرعات، وسجل قرارات الميزانية."
    />

    <div className="flex justify-end">
      <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث الفحص</Button>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4" />درجة الجاهزية</div>
            <div className={`mt-2 text-5xl font-black ${scoreTone(data.score)}`}>{data.score}/100</div>
            <div className="mt-2 text-xs text-slate-500">آخر فحص: {new Date(data.generatedAt).toLocaleString()}</div>
          </div>
          <Kpi label="جاهز" value={String(data.summary.passed)} />
          <Kpi label="يحتاج انتباه" value={String(data.summary.warning)} />
          <Kpi label="خلل" value={String(data.summary.failed)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>نتائج الفحص</CardTitle>
          <CardDescription>راجع البنود التي تحتاج انتباه قبل الانتقال لقسم جديد أو إطلاق حملة كبيرة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.checks.map((check) => <div key={check.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-4xl">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${statusClass(check.status)}`}>{statusIcon(check.status)}{statusLabel(check.status)}</span>
                <h2 className="mt-2 text-base font-bold text-slate-950">{check.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{check.description}</p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800"><b>المطلوب:</b> {check.action}</div>
              </div>
              <Link href={check.href} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح القسم</Link>
            </div>
          </div>)}
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-5 text-sm leading-7 text-emerald-900">
          <b>قاعدة التسليم:</b> إذا كانت درجة الجاهزية أعلى من 80 ولا توجد بنود خلل، يمكن الانتقال لقسم جديد. البنود التحذيرية غالبًا تعني أن النظام جاهز بنيويًا، لكنه يحتاج بيانات حقيقية أو أول تبرع إعلاني لإكمال التحقق.
        </CardContent>
      </Card>
    </>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-slate-950">{value}</div></div>; }
