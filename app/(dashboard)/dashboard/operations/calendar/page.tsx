import Link from "next/link";
import { AlertTriangle, ArrowLeft, BellRing, CalendarDays, CheckCircle2, Clock3, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperationsCalendarOverview } from "@/lib/operations/calendar-service";
import { getPlanningOverview } from "@/lib/operations/planning/planning-service";
import { getSeasonReadinessOverview } from "@/lib/operations/seasons/season-service";

const categoryLabel: Record<string, string> = {
  RELIGIOUS: "مناسبة دينية",
  CAMPAIGN: "حملة",
  CONTENT: "محتوى",
  OPERATIONS: "تشغيل",
};

const priorityClass: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const statusClass: Record<string, string> = {
  ON_TRACK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_ATTENTION: "border-amber-200 bg-amber-50 text-amber-700",
  LATE: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function OperationsCalendarPage() {
  const overview = getOperationsCalendarOverview();
  const seasonOverview = getSeasonReadinessOverview();
  const planningOverview = getPlanningOverview();
  const { events, alertRules, kpis } = overview;

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Operations / Calendar & Alerts</p>
          <h1 className="mt-1.5 text-2xl font-black">التقويم والتنبيهات</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            مركز أولي لتجهيز المواسم الدينية والحملات قبل موعدها، وربط كل مناسبة بما تحتاجه من فيديوهات وتصاميم ورسائل. مصدر البيانات: {overview.source}.
          </p>
        </div>
        <Link href="/dashboard/operations/content" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">
          فتح لوحة المحتوى
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardDescription>أحداث تشغيلية</CardDescription><CardTitle className="text-3xl">{kpis.totalEvents}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>أولوية عالية</CardDescription><CardTitle className="text-3xl">{kpis.highPriority}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>مواد مطلوبة مبدئيًا</CardDescription><CardTitle className="text-3xl">{kpis.totalAssets}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>مواسم متابعة</CardDescription><CardTitle className="text-3xl">{seasonOverview.summary.totalSeasons}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>متأخر</CardDescription><CardTitle className="text-3xl">{seasonOverview.summary.late}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>إجراءات مقترحة</CardDescription><CardTitle className="text-3xl">{planningOverview.summary.totalActions}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#025EB8]" /> الخطة المقترحة</CardTitle>
          <CardDescription>إجراءات إنتاجية محسوبة من Planning Engine بناءً على نقص المواد في Season Engine.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {planningOverview.actions.map((action) => (
            <div key={action.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">{action.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{action.reason}</p>
                </div>
                <Badge variant="outline" className={priorityClass[action.priority]}>{action.priority}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <span>النوع: <b>{action.type}</b></span>
                <span>المسؤول: <b>{action.suggestedOwner}</b></span>
                <span>الموعد: <b>{action.dueLabel}</b></span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#025EB8]" /> جاهزية المواسم</CardTitle>
          <CardDescription>قراءة محسوبة من Season Engine لتوضيح الجاهزية، النقص، والتنبيهات التشغيلية.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {seasonOverview.seasons.map((season) => (
            <div key={season.seasonId} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">{season.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{season.focus}</p>
                </div>
                <Badge variant="outline" className={statusClass[season.status]}>{season.status}</Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                <span>الجاهزية: <b>{season.readinessScore}%</b></span>
                <span>المطلوب: <b>{season.requiredAssets}</b></span>
                <span>الجاهز: <b>{season.readyAssets}</b></span>
                <span>الناقص: <b>{season.missingAssets}</b></span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${season.readinessScore}%` }} />
              </div>
              <div className="mt-4 space-y-2">
                {season.alerts.map((alert) => (
                  <div key={alert} className="flex gap-2 rounded-xl border bg-white p-3 text-xs leading-5 text-slate-600">
                    <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-[#025EB8]" />
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#025EB8]" /> خريطة المواسم والتنبيهات</CardTitle>
            <CardDescription>نسخة تأسيسية ثابتة. لاحقًا سيتم ربطها بقاعدة البيانات، التقويم الهجري، والتنبيهات الفعلية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black text-slate-900">{event.title}</h2>
                      <Badge variant="outline" className="bg-white text-slate-600">{categoryLabel[event.category]}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{event.focus}</p>
                  </div>
                  <Badge variant="outline" className={priorityClass[event.priority]}>{event.priority}</Badge>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#025EB8]" /> {event.dateLabel}</span>
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#025EB8]" /> {event.hijriLabel || "غير محدد"}</span>
                  <span className="flex items-center gap-2"><BellRing className="h-4 w-4 text-[#025EB8]" /> قبل {event.leadTimeDays} يوم</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.requiredAssets.map((asset) => (
                    <Badge key={asset} variant="outline" className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{asset}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-[#025EB8]/20 bg-blue-50/60"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#025EB8]" /> دور AI لاحقًا</CardTitle><CardDescription className="leading-6">سيقرأ AI لاحقًا الخطة المقترحة، ويحوّلها إلى مسودات محتوى وجدول أولويات قابل للمراجعة البشرية.</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> قواعد التنبيه</CardTitle></CardHeader><CardContent className="space-y-3">{alertRules.map((rule) => <div key={rule} className="flex gap-2 rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#025EB8]" />{rule}</div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#025EB8]" /> القادم</CardTitle><CardDescription className="leading-6">الخطوة القادمة ستكون تحويل هذه الإجراءات إلى مهام إنتاج فعلية مرتبطة بلوحة المحتوى.</CardDescription></CardHeader></Card>
        </div>
      </div>
    </div>
  );
}
