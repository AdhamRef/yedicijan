import Link from "next/link";
import { AlertTriangle, CheckCircle2, Search, TextCursorInput } from "lucide-react";
import { GOOGLE_ADS_DEEP_AREAS, GOOGLE_ADS_REQUIRED_FIELDS } from "@/lib/marketing/google-ads-deep-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoogleAdsDeepDataPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">Marketing Operating System</p>
      <h1 className="mt-2 text-3xl font-black">Google Ads Deep Data</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/85">مركز تحليل Google Ads العميق: الكلمات، عبارات البحث، العناوين، الأوصاف، الأصول، وروابط الهبوط. الهدف تقليل التشتيت ومعرفة ما يصرف بدون تبرعات.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card><CardContent className="p-4"><div className="text-xs text-slate-500">مناطق التحليل</div><div className="mt-2 text-2xl font-black text-slate-950">{GOOGLE_ADS_DEEP_AREAS.length}</div></CardContent></Card>
      <Card><CardContent className="p-4"><div className="text-xs text-slate-500">حقول الربط المطلوبة</div><div className="mt-2 text-2xl font-black text-slate-950">{GOOGLE_ADS_REQUIRED_FIELDS.length}</div></CardContent></Card>
      <Card><CardContent className="p-4"><div className="text-xs text-slate-500">حالة التنفيذ</div><div className="mt-2 text-2xl font-black text-amber-700">جاهز للمرحلة التالية</div></CardContent></Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />ما المطلوب قبل تفعيل السحب؟</CardTitle>
        <CardDescription>هذه المتطلبات موجود شرحها داخل صفحة الربط والتتبع في كارت Google Ads.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {GOOGLE_ADS_REQUIRED_FIELDS.map((field) => <div key={field} className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700"><CheckCircle2 className="mb-2 h-4 w-4 text-[#025EB8]" />{field}</div>)}
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-2">
      {GOOGLE_ADS_DEEP_AREAS.map((area) => <Card key={area.key} className="overflow-hidden">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-[#025EB8]" />{area.title}</CardTitle>
          <CardDescription className="leading-6">{area.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900"><b>لماذا مهم؟</b> {area.whyItMatters}</div>
          <details className="rounded-xl border bg-white p-3">
            <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">قالب GAQL المخطط</summary>
            <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs leading-5 text-slate-100" dir="ltr">{area.gaql}</pre>
          </details>
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><TextCursorInput className="h-4 w-4 text-[#025EB8]" />المخرجات المتوقعة</div>
            <div className="flex flex-wrap gap-2">{area.outputs.map((item) => <span key={item} className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700">{item}</span>)}</div>
          </div>
        </CardContent>
      </Card>)}
    </div>

    <Card>
      <CardHeader><CardTitle>روابط مرتبطة</CardTitle><CardDescription>ابدأ من الربط ثم سحب البيانات ثم التحليل.</CardDescription></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/dashboard/marketing/tracking-hub" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">الربط والتتبع</Link>
        <Link href="/dashboard/marketing/data-sync" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">سحب البيانات</Link>
        <Link href="/dashboard/marketing/insights" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">التحليل والتوصيات</Link>
      </CardContent>
    </Card>
  </div>;
}
