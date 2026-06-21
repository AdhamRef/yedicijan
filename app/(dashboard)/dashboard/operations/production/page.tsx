import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clapperboard, FileText, Megaphone, Palette, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductionBoardOverview } from "@/lib/operations/production/production-service";

const priorityClass: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const stageIcon: Record<string, typeof FileText> = {
  IDEA: Sparkles,
  SCRIPT: FileText,
  DESIGN: Palette,
  VIDEO: Clapperboard,
  REVIEW: CheckCircle2,
  READY: Megaphone,
  PUBLISHED: CheckCircle2,
};

export default function OperationsProductionPage() {
  const overview = getProductionBoardOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Operations / Production Board</p>
          <h1 className="mt-1.5 text-2xl font-black">لوحة الإنتاج</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            متابعة المواد من الفكرة إلى النشر ثم الاستخدام في الإعلانات. مصدر البيانات: {overview.source}.
          </p>
        </div>
        <Link href="/dashboard/operations/tasks" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">
          فتح مهام الإنتاج
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardDescription>إجمالي المواد</CardDescription><CardTitle className="text-3xl">{overview.summary.totalItems}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>قيد الإنتاج</CardDescription><CardTitle className="text-3xl">{overview.summary.inProduction}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>جاهز للتسويق</CardDescription><CardTitle className="text-3xl">{overview.summary.ready}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>منشور</CardDescription><CardTitle className="text-3xl">{overview.summary.published}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>مستخدم في إعلانات</CardDescription><CardTitle className="text-3xl">{overview.summary.usedInAds}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>أولوية عالية</CardDescription><CardTitle className="text-3xl">{overview.summary.highPriority}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        {overview.columns.map((column) => {
          const Icon = stageIcon[column.stage] ?? FileText;
          return (
            <Card key={column.stage} className="min-h-[420px] bg-slate-50/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#025EB8] shadow-sm"><Icon className="h-4 w-4" /></span>
                  <Badge variant="outline" className="bg-white">{column.items.length}</Badge>
                </div>
                <CardTitle className="text-base">{column.title}</CardTitle>
                <CardDescription className="text-xs leading-5">{column.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-black leading-6 text-slate-900">{item.title}</h2>
                      <Badge variant="outline" className={priorityClass[item.priority]}>{item.priority}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                      <p>{item.seasonTitle} · {item.contentType}</p>
                      <p>{item.owner} · {item.dueLabel}</p>
                      {item.resultLabel ? <p className="font-semibold text-[#025EB8]">{item.resultLabel}</p> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      {item.scriptUrl ? <span className="rounded-full bg-slate-100 px-2 py-1">نص: {item.scriptUrl}</span> : null}
                      {item.designUrl ? <span className="rounded-full bg-slate-100 px-2 py-1">تصميم: {item.designUrl}</span> : null}
                      {item.videoUrl ? <span className="rounded-full bg-slate-100 px-2 py-1">فيديو: {item.videoUrl}</span> : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-[#025EB8]/20 bg-blue-50/60">
        <CardHeader>
          <CardTitle>القادم</CardTitle>
          <CardDescription className="leading-6">
            لاحقًا سيتم ربط هذه اللوحة بقاعدة البيانات، روابط الملفات، التسليم للتسويق، ونتائج الإعلانات حتى يصبح خط الإنتاج كاملًا من الفكرة إلى الأداء.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
