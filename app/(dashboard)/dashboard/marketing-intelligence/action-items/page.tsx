"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Loader2, RefreshCw, Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type ActionItem = {
  id: string;
  priority: Priority;
  type: "LINK" | "CONVERSION" | "PLATFORM" | "SYSTEM";
  title: string;
  description: string;
  action: string;
  href: string;
};

type ApiResponse = {
  ok: boolean;
  generatedAt: string;
  summary: { total: number; high: number; medium: number; low: number };
  items: ActionItem[];
};

function priorityLabel(priority: Priority) {
  if (priority === "HIGH") return "عاجل";
  if (priority === "MEDIUM") return "متوسط";
  return "منخفض";
}

function priorityClass(priority: Priority) {
  if (priority === "HIGH") return "border-rose-200 bg-rose-50 text-rose-800";
  if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function typeLabel(type: ActionItem["type"]) {
  if (type === "LINK") return "روابط";
  if (type === "CONVERSION") return "تحويلات";
  if (type === "PLATFORM") return "منصات";
  return "النظام";
}

export default function MarketingActionItemsPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/action-items", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل مركز الإجراءات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق
        </Link>
        <h1 className="text-2xl font-black text-slate-950">مركز الإجراءات التسويقية</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          قائمة تنفيذ سريعة تجمع مشاكل الروابط، التحويلات، والمنصات في مكان واحد حتى يعرف الفريق ما يجب إصلاحه أولًا.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        <Button variant="outline" onClick={() => window.open("/api/admin/marketing-intelligence/action-items/export", "_blank")} className="gap-2"><Download className="h-4 w-4" />تصدير CSV</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات متاحة.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">إجمالي الإجراءات</div><div className="mt-1 text-2xl font-black">{data.summary.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">عاجل</div><div className="mt-1 text-2xl font-black text-rose-700">{data.summary.high}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">متوسط</div><div className="mt-1 text-2xl font-black text-amber-700">{data.summary.medium}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">منخفض</div><div className="mt-1 text-2xl font-black text-emerald-700">{data.summary.low}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-[#025EB8]" />ما يجب فعله الآن</CardTitle>
          <CardDescription>آخر فحص: {new Date(data.generatedAt).toLocaleString("ar")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.map((item) => <div key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${priorityClass(item.priority)}`}>{priorityLabel(item.priority)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{typeLabel(item.type)}</span>
                </div>
                <h2 className="text-base font-bold text-slate-950">{item.title}</h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">{item.description}</p>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                  <b>الإجراء المقترح:</b> {item.action}
                </div>
              </div>
              <Link href={item.href} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                {item.priority === "LOW" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                فتح
              </Link>
            </div>
          </div>)}
        </CardContent>
      </Card>
    </>}
  </div>;
}
