"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RetryResult = {
  donationId: string;
  paidAt: string | null;
  amount: number;
  currency: string;
  wasAlreadyMarkedSent?: boolean;
  previousLedger?: { hasLedger?: boolean; hasSent?: boolean; statuses?: string[] };
  result?: { ok?: boolean; skipped?: boolean; reason?: string; error?: string; fbtrace_id?: string };
};

type RetrySummary = {
  ok?: boolean;
  scanned?: number;
  considered?: number;
  limit?: number;
  days?: number;
  results?: RetryResult[];
};

function resultLabel(result?: RetryResult["result"]) {
  if (!result) return "لا توجد نتيجة";
  if (result.ok) return "تم الإرسال";
  if (result.skipped) return `تم التخطي: ${result.reason ?? "غير محدد"}`;
  return `فشل: ${result.error ?? result.reason ?? "غير محدد"}`;
}

function statusClass(result?: RetryResult["result"]) {
  if (result?.ok) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (result?.skipped) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default function MarketingRepairCenterPage() {
  const [days, setDays] = React.useState(7);
  const [limit, setLimit] = React.useState(25);
  const [running, setRunning] = React.useState(false);
  const [summary, setSummary] = React.useState<RetrySummary | null>(null);

  async function runRepair() {
    setRunning(true);
    try {
      const response = await fetch("/api/admin/marketing-intelligence/retry-missing-conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, limit }),
      });
      const data = (await response.json().catch(() => ({}))) as RetrySummary;
      if (!response.ok || data.ok === false) throw new Error("repair failed");
      setSummary(data);
      toast.success(`تمت مراجعة ${data.scanned ?? 0} تحويل`);
    } catch {
      toast.error("تعذر تشغيل مركز الإصلاح");
    } finally {
      setRunning(false);
    }
  }

  const results = summary?.results ?? [];
  const sent = results.filter((row) => row.result?.ok).length;
  const skipped = results.filter((row) => row.result?.skipped).length;
  const failed = results.length - sent - skipped;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Wrench className="h-3.5 w-3.5" />
            مركز إصلاح التحويلات
          </div>
          <h1 className="mt-3 text-2xl font-black text-slate-900">مراجعة وإعادة إرسال التحويلات المفقودة</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            هذه الصفحة تفحص التبرعات المدفوعة التي لا يظهر لها إرسال Meta Server ناجح في سجل التحويلات، ثم تحاول إعادة إرسالها بأمان.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/dashboard/marketing-intelligence">
            مركز التسويق
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/dashboard/conversion-events">
            سجل التحويلات
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تشغيل فحص آمن</CardTitle>
          <CardDescription>
            لا يتم إنشاء تبرعات جديدة. يتم فقط فحص التبرعات المدفوعة ومحاولة إصلاح إرسال التحويل النهائي عند الحاجة.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">الفترة بالأيام</span>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(event) => setDays(Math.max(1, Math.min(30, Number(event.target.value) || 7)))}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">أقصى عدد للفحص</span>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(event) => setLimit(Math.max(1, Math.min(100, Number(event.target.value) || 25)))}
              className="w-full rounded-md border px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <Button onClick={runRepair} disabled={running} className="w-full gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              تشغيل الفحص
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4"><div className="text-sm text-slate-500">تم فحصها</div><div className="mt-2 text-3xl font-black">{summary.scanned ?? 0}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-slate-500">تم الإرسال</div><div className="mt-2 text-3xl font-black text-emerald-700">{sent}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-slate-500">تم التخطي</div><div className="mt-2 text-3xl font-black text-amber-700">{skipped}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-slate-500">فشل</div><div className="mt-2 text-3xl font-black text-rose-700">{failed}</div></CardContent></Card>
        </div>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج الإصلاح</CardTitle>
            <CardDescription>راجع الحالات الفاشلة من سجل التحويلات لمعرفة السبب التفصيلي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((row) => (
              <div key={row.donationId} className="rounded-xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-xs text-slate-500">{row.donationId}</div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${statusClass(row.result)}`}>
                    {row.result?.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {resultLabel(row.result)}
                  </span>
                </div>
                <div className="mt-2 text-slate-700">
                  {row.amount} {row.currency} · {row.paidAt ? new Date(row.paidAt).toLocaleString("ar") : "بدون تاريخ دفع"}
                </div>
                {row.previousLedger?.statuses?.length ? (
                  <div className="mt-2 text-xs text-slate-500">الحالة السابقة: {row.previousLedger.statuses.join("، ")}</div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
