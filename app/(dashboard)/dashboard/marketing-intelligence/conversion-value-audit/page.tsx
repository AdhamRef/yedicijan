"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuditRow = {
  donationId: string;
  paidAt: string | null;
  currency: string;
  baseAmount: number;
  teamSupport: number;
  fees: number;
  totalAmount: number;
  expectedConversionValue: number;
  missingFromBase: number;
  verdict: "NO_EXTRA_SUPPORT" | "OK_HAS_TOTAL_VALUE" | "UNDERCOUNTED_OLD_EVENT" | "NEEDS_RECHECK";
  eventValues: Array<{ platform: string; channel: string; status: string; value: number | null; currency: string; eventId: string }>;
};

type ApiResponse = {
  ok: boolean;
  days: number;
  total: number;
  undercounted: number;
  needsRecheck: number;
  withExtraSupport: number;
  rows: AuditRow[];
};

function verdictLabel(verdict: AuditRow["verdict"]) {
  if (verdict === "UNDERCOUNTED_OLD_EVENT") return "حدث قديم ناقص";
  if (verdict === "OK_HAS_TOTAL_VALUE") return "صحيح بالإجمالي";
  if (verdict === "NEEDS_RECHECK") return "يحتاج مراجعة";
  return "لا يوجد دعم إضافي";
}

function verdictClass(verdict: AuditRow["verdict"]) {
  if (verdict === "UNDERCOUNTED_OLD_EVENT" || verdict === "NEEDS_RECHECK") return "border-amber-200 bg-amber-50 text-amber-800";
  if (verdict === "OK_HAS_TOTAL_VALUE") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function ConversionValueAuditPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [days, setDays] = React.useState(7);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketing-intelligence/conversion-value-audit?days=${days}&limit=100`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل تدقيق قيمة التحويلات");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  React.useEffect(() => { void load(); }, [load]);

  function exportCsv() {
    window.open(`/api/admin/marketing-intelligence/conversion-value-audit/export?days=${days}&limit=300`, "_blank");
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق</Link>
        <h1 className="text-2xl font-black text-slate-950">تدقيق قيمة التحويلات</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">يفحص هل البيكسل والتحويلات أرسلت مبلغ المشروع فقط أم الإجمالي الكامل شامل دعم الفريق والرسوم.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value={1}>اليوم</option>
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
        <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" />تصدير CSV</Button>
      </div>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">تبرعات مفحوصة</div><div className="mt-1 text-2xl font-black">{data.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">فيها دعم/رسوم إضافية</div><div className="mt-1 text-2xl font-black text-[#025EB8]">{data.withExtraSupport}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">أحداث قديمة ناقصة</div><div className="mt-1 text-2xl font-black text-amber-700">{data.undercounted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-500">تحتاج مراجعة</div><div className="mt-1 text-2xl font-black text-rose-700">{data.needsRecheck}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>نتائج التدقيق</CardTitle><CardDescription>التبرعات الجديدة بعد الإصلاح يجب أن تظهر بحالة صحيح بالإجمالي عند وجود دعم فريق.</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-right">التبرع</th><th className="px-3 py-2 text-right">المبالغ</th><th className="px-3 py-2 text-right">المتوقع</th><th className="px-3 py-2 text-right">أحداث التحويل</th><th className="px-3 py-2 text-right">الحكم</th></tr></thead>
              <tbody>
                {data.rows.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا توجد نتائج.</td></tr> : data.rows.map((row) => <tr key={row.donationId} className="border-t align-top">
                  <td className="px-3 py-2 font-mono text-xs"><div>{row.donationId}</div><div className="mt-1 text-slate-400">{row.paidAt}</div></td>
                  <td className="px-3 py-2"><div>المشروع: {row.baseAmount} {row.currency}</div><div>دعم الفريق: {row.teamSupport} {row.currency}</div><div>الرسوم: {row.fees} {row.currency}</div><div className="font-bold">الإجمالي: {row.totalAmount} {row.currency}</div></td>
                  <td className="px-3 py-2 font-bold">{row.expectedConversionValue} {row.currency}<div className="text-xs font-normal text-slate-500">فرق عن مبلغ المشروع: {row.missingFromBase}</div></td>
                  <td className="px-3 py-2 text-xs">{row.eventValues.length === 0 ? "لا يوجد حدث" : row.eventValues.map((event, index) => <div key={`${event.eventId}-${index}`} className="mb-1 rounded bg-slate-50 p-1">{event.platform}/{event.channel} · {event.status} · {event.value ?? "—"} {event.currency}</div>)}</td>
                  <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${verdictClass(row.verdict)}`}>{row.verdict === "OK_HAS_TOTAL_VALUE" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{verdictLabel(row.verdict)}</span></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>}
  </div>;
}
