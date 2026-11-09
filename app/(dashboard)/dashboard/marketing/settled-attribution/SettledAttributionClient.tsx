"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = { source: string; settledDonations: number; settledUsdKnown: number; missingUsd: number; oneTime: number; recurring: number };
type ResponseData = {
  sources: Row[];
  totals: Omit<Row, "source"> & { unsettledExcluded: number };
  sampled: number;
  totalMatching: number;
  complete: boolean;
  warnings: string[];
};

export function SettledAttributionClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<ResponseData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const money = (value: number) => new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const response = await fetch("/api/admin/marketing/settled-attribution?" + qs, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "فشل تحميل البيانات");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل النتائج");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <Link href="/dashboard/marketing/attribution" className="text-sm underline">العودة إلى الروابط والإسناد</Link>
        <h1 className="text-2xl font-semibold">المقبوضات المؤكدة حسب مصدر الزيارة</h1>
        <p className="text-sm text-muted-foreground">
          تقرير للقراءة فقط يعرض التبرعات المسددة فعليًا، لا التحويلات التي تدعي المنصات تسجيلها.
          جميع مبالغ الدولار من حقول USD الموثقة أو من تبرعات مسجلة أصلًا بالدولار.
        </p>
      </header>
      <section className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <label className="text-sm">من (UTC)
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="text-sm">إلى (UTC)
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <Button disabled={busy} onClick={refresh}>{busy ? "جاري المراجعة…" : "تحديث التقرير"}</Button>
      </section>
      {error && <p role="alert" className="rounded-lg border border-red-300 p-4 text-red-700">{error}</p>}
      {busy && !report && <p role="status" className="rounded-lg border p-4">جاري تحميل المقبوضات…</p>}
      {report && (
        <>
          {!report.complete && (
            <p role="alert" className="rounded-lg border border-amber-500 bg-amber-50 p-4 text-amber-900">
              تنبيه: هذا تقرير جزئي؛ عُرضت {report.sampled} من {report.totalMatching} عملية. لا تعتمد الإجماليات للمحاسبة.
            </p>
          )}
          {report.warnings.map((warning, i) => <p key={i} role="status" className="rounded-lg border p-3 text-sm">{warning}</p>)}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["تبرعات مسددة", report.totals.settledDonations.toLocaleString("en-US")],
              ["القيمة الموثوقة بالدولار", "$" + money(report.totals.settledUsdKnown)],
              ["قيم USD غير متوفرة", String(report.totals.missingUsd)],
              ["اشتراكات / مرة واحدة", report.totals.recurring + " / " + report.totals.oneTime],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-2 break-words text-xl font-bold">{value}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-muted"><tr>
                <th className="p-3">المصدر</th><th className="p-3">المقبوضة</th>
                <th className="p-3">USD الموثوق</th><th className="p-3">بدون USD</th>
                <th className="p-3">دوري</th><th className="p-3">مرة واحدة</th>
              </tr></thead>
              <tbody>
                {report.sources.length === 0 ? <tr><td colSpan={6} className="p-6 text-center">لا توجد تبرعات مسددة في الفترة المختارة.</td></tr>
                  : report.sources.map((row) => <tr key={row.source} className="border-t">
                    <td className="p-3">{row.source}</td>
                    <td className="p-3">{row.settledDonations}</td>
                    <td className="p-3" dir="ltr">{"$" + money(row.settledUsdKnown)}</td>
                    <td className="p-3">{row.missingUsd}</td>
                    <td className="p-3">{row.recurring}</td>
                    <td className="p-3">{row.oneTime}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">تنبيه محاسبي: البيانات المصنّفة دون سعر تحويل USD موثوق تبقى ضمن عدد العمليات، ولا تُقدَّر قيمتها بالدولار. هذا التقرير لا يقيس تكلفة الإعلان أو ROAS، ولا يصلح وحده بديلًا عن قيود المحاسبة.</p>
        </>
      )}
    </main>
  );
}
