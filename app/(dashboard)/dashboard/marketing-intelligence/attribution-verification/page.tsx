"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingWorkflowHeader } from "../_components/MarketingWorkflowHeader";

type Row = {
  donationId: string;
  platform: string;
  eventId: string;
  value: number;
  currency: string;
  campaignId?: string;
  adId?: string;
  status: "PENDING" | "LIKELY_COUNTED" | "NOT_CONFIRMED" | "RETRIED" | "NEEDS_REVIEW" | "NO_AD_ATTRIBUTION";
  reason?: string;
  attempts?: number;
  metaServerSent?: boolean;
  metaBrowserSent?: boolean;
  metaBrowserSkipped?: boolean;
  platformCredit?: boolean;
  updatedAt?: string | { $date?: string };
  paidAt?: string | { $date?: string };
};

type ApiResponse = { ok: boolean; rows: Row[]; summary: { total: number; pending: number; likelyCounted: number; needsReview: number } };

function money(value: number | undefined, currency: string | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || ""}` : "—";
}
function dateText(value: Row["updatedAt"]) {
  const raw = typeof value === "string" ? value : value?.$date;
  if (!raw) return "—";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
}
function statusLabel(status: Row["status"]) {
  if (status === "LIKELY_COUNTED") return "غالبًا محسوب";
  if (status === "NOT_CONFIRMED") return "غير مؤكد";
  if (status === "RETRIED") return "أُعيد الإرسال";
  if (status === "NEEDS_REVIEW") return "يحتاج مراجعة";
  if (status === "NO_AD_ATTRIBUTION") return "بدون إسناد";
  return "قيد المتابعة";
}
function statusClass(status: Row["status"]) {
  if (status === "LIKELY_COUNTED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "NEEDS_REVIEW") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "RETRIED" || status === "NOT_CONFIRMED") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function boolBadge(label: string, value?: boolean, skipped?: boolean) {
  const cls = value ? "border-emerald-200 bg-emerald-50 text-emerald-800" : skipped ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-500";
  return <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>{label}: {value ? "نعم" : skipped ? "تخطي" : "لا"}</span>;
}

export default function AttributionVerificationPage() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/attribution-verification?limit=150", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) throw new Error("failed");
      setData(json);
    } catch {
      toast.error("تعذر تحميل متابعة الإسناد الإعلاني");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function process(donationId?: string, retry = false) {
    setWorking(donationId || "all");
    try {
      const res = await fetch("/api/admin/marketing-intelligence/attribution-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId, retry }),
      });
      const json = await res.json().catch(() => null) as { ok?: boolean; processed?: number; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "failed");
      toast.success(`تم فحص ${json.processed || 0} سجل`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الفحص");
    } finally {
      setWorking(null);
    }
  }

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <MarketingWorkflowHeader
      current="متابعة احتساب التبرعات"
      title="متابعة احتساب التبرعات في الحساب الإعلاني"
      description="يتابع التبرعات القادمة من روابط إعلانية، ويتحقق من Browser/Server events، ويحاول إعادة إرسال CAPI آمنًا عند عدم تأكيد الاحتساب."
    />

    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
      <Button variant="outline" onClick={() => void process(undefined, false)} disabled={working === "all"} className="gap-2">{working === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}تحقق من الكل</Button>
      <Button onClick={() => void process(undefined, true)} disabled={working === "all"} className="gap-2">{working === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}تحقق + أعد الإرسال</Button>
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !data ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات.</CardContent></Card> : <>
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="الإجمالي" value={String(data.summary.total)} />
        <Kpi label="قيد المتابعة" value={String(data.summary.pending)} />
        <Kpi label="غالبًا محسوب" value={String(data.summary.likelyCounted)} />
        <Kpi label="يحتاج مراجعة" value={String(data.summary.needsReview)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجلات المتابعة</CardTitle>
          <CardDescription>هذه الشاشة لا تدعي أن Meta أعطت تأكيد donation-level، لكنها تتابع أفضل إشارات ممكنة: Browser/Server/platform metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.rows.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">لا توجد تبرعات إعلانية حديثة للمتابعة.</div> : data.rows.map((row) => <div key={`${row.platform}-${row.donationId}`} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-5xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{row.platform}</span>
                  <span className="text-xs text-slate-500">محاولات: {row.attempts || 0}</span>
                </div>
                <h2 className="mt-2 font-bold text-slate-950">تبرع: {row.donationId}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{row.reason || "في انتظار الفحص"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {boolBadge("Server", row.metaServerSent)}
                  {boolBadge("Browser", row.metaBrowserSent, row.metaBrowserSkipped)}
                  {boolBadge("Platform Credit", row.platformCredit)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>Value: {money(row.value, row.currency)}</span>
                  <span>Campaign: {row.campaignId || "—"}</span>
                  <span>Ad: {row.adId || "—"}</span>
                  <span>Updated: {dateText(row.updatedAt)}</span>
                  <span>Event: {row.eventId}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => void process(row.donationId, false)} disabled={working === row.donationId} className="gap-2">{working === row.donationId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}تحقق</Button>
                <Button variant="outline" onClick={() => void process(row.donationId, true)} disabled={working === row.donationId} className="gap-2"><RotateCcw className="h-4 w-4" />إعادة آمنة</Button>
                <Link href={`/dashboard/conversion-events?search=${encodeURIComponent(row.donationId)}`} className="rounded-md border px-3 py-2 text-center text-sm hover:bg-slate-50">الأحداث</Link>
              </div>
            </div>
          </div>)}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex gap-3 p-5 text-sm leading-7 text-amber-900">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
          <div><b>تنبيه مهم:</b> لا يمكن لأي نظام خارجي تأكيد Donation ID بعينه من Ads Manager مباشرة. هذه الشاشة تستخدم أفضل إشارات عملية: تطابق event_id، نجاح Browser/Server، وظهور conversions/value على مستوى الحملة أو الإعلان.</div>
        </CardContent>
      </Card>
    </>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-slate-950">{value}</div></CardContent></Card>; }
