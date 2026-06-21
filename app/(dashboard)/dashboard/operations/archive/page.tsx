import Link from "next/link";
import { Archive, ArrowLeft, FileText, ImageIcon, Search, Tags, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getArchiveOverview } from "@/lib/operations/archive/archive-service";

const typeIcon: Record<string, typeof FileText> = {
  DESIGN: ImageIcon,
  VIDEO: Video,
  CAROUSEL: ImageIcon,
  COPY: FileText,
  WHATSAPP: FileText,
  EMAIL: FileText,
  AD: Archive,
};

const statusClass: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  READY: "border-blue-200 bg-blue-50 text-blue-700",
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  USED_IN_ADS: "border-amber-200 bg-amber-50 text-amber-700",
  ARCHIVED: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export default function OperationsArchivePage() {
  const overview = getArchiveOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Operations / Archive Center</p>
          <h1 className="mt-1.5 text-2xl font-black">مركز الأرشيف</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            ذاكرة المواد المنتجة: فيديوهات، تصاميم، رسائل، كاروسيل، وإعلانات مع ربطها بالموسم والحملة والنتيجة.
          </p>
        </div>
        <Link href="/dashboard/operations/production" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">
          فتح لوحة الإنتاج
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardDescription>إجمالي المواد</CardDescription><CardTitle className="text-3xl">{overview.summary.totalAssets}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>جاهزة</CardDescription><CardTitle className="text-3xl">{overview.summary.ready}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>منشورة</CardDescription><CardTitle className="text-3xl">{overview.summary.published}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>داخل الإعلانات</CardDescription><CardTitle className="text-3xl">{overview.summary.usedInAds}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>فيديوهات</CardDescription><CardTitle className="text-3xl">{overview.summary.videos}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>تصاميم/كاروسيل</CardDescription><CardTitle className="text-3xl">{overview.summary.designs}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-[#025EB8]" /> مكتبة المواد</CardTitle>
            <CardDescription>Foundation static data الآن، وقابل لاحقًا للتحول إلى Prisma-backed archive.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {overview.assets.map((asset) => {
              const Icon = typeIcon[asset.type] ?? FileText;
              return (
                <div key={asset.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
                    <Badge variant="outline" className={statusClass[asset.status]}>{asset.status}</Badge>
                  </div>
                  <h2 className="mt-3 font-black text-slate-900">{asset.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{asset.campaignTitle} · {asset.seasonTitle}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <span>النوع: <b>{asset.type}</b></span>
                    <span>اللغة: <b>{asset.language}</b></span>
                    <span>المسؤول: <b>{asset.owner}</b></span>
                    <span>الملف: <b>{asset.fileLabel}</b></span>
                  </div>
                  {asset.performanceLabel ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{asset.performanceLabel}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">#{tag}</span>)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5 text-[#025EB8]" /> الوسوم</CardTitle>
              <CardDescription>تساعد لاحقًا في البحث والاقتراحات الذكية.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {overview.tagCloud.map((tag) => <Badge key={tag.tag} variant="outline" className="bg-white">#{tag.tag} · {tag.count}</Badge>)}
            </CardContent>
          </Card>

          <Card className="border-[#025EB8]/20 bg-blue-50/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-[#025EB8]" /> القادم</CardTitle>
              <CardDescription className="leading-6">
                الخطوة التالية: بحث وفلاتر حسب الموسم والحملة واللغة، ثم ربط الأرشيف بنتائج الإعلانات والتبرعات.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
