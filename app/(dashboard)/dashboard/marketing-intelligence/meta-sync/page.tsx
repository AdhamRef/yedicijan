"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SyncResult = {
  runId?: string;
  connectionId?: string | null;
  platform?: string;
  status?: string;
  rowsFetched?: number;
  message?: string;
  error?: string | null;
  missingRequiredFields?: string[];
};

type SyncResponse = {
  ok?: boolean;
  status?: string;
  range?: { from: string; to: string };
  results?: SyncResult[];
};

export default function MetaSyncPage() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<SyncResponse | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing-intelligence/sync-meta", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as SyncResponse;
      setResult(data);
      if (!res.ok || data.ok === false) throw new Error(data.results?.[0]?.error || data.status || "sync failed");
      const rows = (data.results ?? []).reduce((sum, row) => sum + (row.rowsFetched ?? 0), 0);
      toast.success(`تمت مزامنة Meta (${rows} سجل)`);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? `فشلت مزامنة Meta: ${error.message}` : "فشلت مزامنة Meta");
    } finally {
      setLoading(false);
    }
  }

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div>
      <h1 className="text-2xl font-black text-slate-950">مزامنة Meta</h1>
      <p className="mt-1 text-sm text-slate-500">تشغيل مزامنة بيانات Meta لآخر 7 أيام حتى تظهر أرقام الصرف والتحويلات داخل مقارنة ذكاء التسويق.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>تشغيل المزامنة</CardTitle>
        <CardDescription>بعد نجاح المزامنة ارجع إلى ذكاء التسويق واضغط تحديث.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={loading} className="gap-2 bg-[#025EB8] hover:bg-[#024a91]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          مزامنة Meta الآن
        </Button>
        {result ? <div className="rounded-xl border bg-slate-50 p-4 text-sm">
          <div className="font-bold">النتيجة: {result.status ?? "—"}</div>
          <div className="mt-1 text-slate-500">الفترة: {result.range?.from ?? "—"} — {result.range?.to ?? "—"}</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs text-slate-500"><tr><th className="py-2 text-right">المنصة</th><th className="py-2 text-right">الحالة</th><th className="py-2 text-right">السجلات</th><th className="py-2 text-right">الرسالة</th><th className="py-2 text-right">الخطأ</th></tr></thead>
              <tbody>{(result.results ?? []).map((row, index) => <tr key={row.runId ?? index} className="border-b last:border-0"><td className="py-2">{row.platform ?? "—"}</td><td className="py-2">{row.status ?? "—"}</td><td className="py-2">{row.rowsFetched ?? 0}</td><td className="py-2">{row.message ?? "—"}</td><td className="py-2 text-rose-700">{row.error ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        </div> : null}
      </CardContent>
    </Card>
  </div>;
}
