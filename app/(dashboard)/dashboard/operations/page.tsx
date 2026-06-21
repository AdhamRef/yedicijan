import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, FileText, Megaphone, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanningOverview } from "@/lib/operations/planning/planning-service";
import { getSeasonReadinessOverview } from "@/lib/operations/seasons/season-service";
import { getTaskOverview } from "@/lib/operations/tasks/task-service";

const pillars = [
  ["التقويم", "المناسبات، المواسم، والأسابيع التشغيلية.", CalendarDays, "/dashboard/operations/calendar"],
  ["خطة المحتوى", "الأفكار، النصوص، التصاميم، والفيديوهات.", FileText, "/dashboard/operations/content"],
  ["مهام الفريق", "من المسؤول؟ ما الحالة؟ وما موعد التسليم؟", ClipboardList, "/dashboard/operations/tasks"],
  ["التسليم للتسويق", "ربط المحتوى لاحقًا بروابط الحملات ونتائج الأداء.", Megaphone, "/dashboard/marketing"],
] as const;

const rules = [
  "Operations لا يعيد بناء Marketing.",
  "Marketing يبقى مسؤولًا عن الربط، التتبع، الروابط، والتحليلات.",
  "Operations مسؤول عن التخطيط، الإنتاج، المهام، والنشر.",
  "أي AI لاحقًا يكون Draft ويحتاج مراجعة بشرية.",
] as const;

export default function OperationsHomePage() {
  const seasonOverview = getSeasonReadinessOverview();
  const planningOverview = getPlanningOverview();
  const taskOverview = getTaskOverview();
  const criticalSeasons = seasonOverview.seasons.filter((season) => season.status !== "ON_TRACK");

  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs text-white/70">Growth Suite / Content & Operations</p>
        <h1 className="mt-1.5 text-2xl font-black">مركز العمليات والمحتوى</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">مركز تنفيذي يجمع المواسم، الجاهزية، الخطة المقترحة، ومهام الإنتاج قبل تسليم المواد إلى نظام التسويق.</p>
      </div>
      <Link href="/dashboard/operations/tasks" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">
        فتح مهام الإنتاج
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>

    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      <Card><CardHeader><CardDescription>مواسم متابعة</CardDescription><CardTitle className="text-3xl">{seasonOverview.summary.totalSeasons}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>متأخر</CardDescription><CardTitle className="text-3xl">{seasonOverview.summary.late}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>يحتاج متابعة</CardDescription><CardTitle className="text-3xl">{seasonOverview.summary.needsAttention}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>إجراءات مقترحة</CardDescription><CardTitle className="text-3xl">{planningOverview.summary.totalActions}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>مهام إنتاج</CardDescription><CardTitle className="text-3xl">{taskOverview.summary.totalTasks}</CardTitle></CardHeader></Card>
      <Card><CardHeader><CardDescription>مهام عالية</CardDescription><CardTitle className="text-3xl">{taskOverview.summary.highPriority}</CardTitle></CardHeader></Card>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {pillars.map(([title, description, Icon, href]) => <Link key={title} href={href} className="block h-full">
        <Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-sm">
          <CardHeader>
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="leading-6">{description}</CardDescription>
          </CardHeader>
        </Card>
      </Link>)}
    </div>

    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#025EB8]" /> مواسم تحتاج متابعة</CardTitle>
          <CardDescription>أقرب نقطة تشخيص قبل الإنتاج: هل الموسم جاهز أم يحتاج تدخل؟</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(criticalSeasons.length ? criticalSeasons : seasonOverview.seasons).map((season) => <div key={season.seasonId} className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-900">{season.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{season.focus}</p>
              </div>
              <span className="text-2xl font-black text-[#025EB8]">{season.readinessScore}%</span>
            </div>
            <div className="mt-3 text-sm text-slate-600">الناقص: <b>{season.missingAssets}</b> من أصل <b>{season.requiredAssets}</b></div>
          </div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#025EB8]" /> أعلى مهام الإنتاج</CardTitle>
          <CardDescription>مهام مولدة من Planning Engine وجاهزة للمتابعة التشغيلية.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {taskOverview.tasks.slice(0, 5).map((task) => <div key={task.id} className="rounded-2xl border bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-900">{task.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{task.assignee} · {task.dueLabel}</p>
              </div>
              <span className="rounded-full border bg-white px-3 py-1 text-xs font-bold text-slate-700">{task.priority}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${task.progress}%` }} /></div>
          </div>)}
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>حدود النظام</CardTitle><CardDescription>هذه الطبقة تنظّم الإنتاج ولا تخلط مسؤوليات التسويق والتتبع.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{rules.map((rule) => <div key={rule} className="flex gap-2 rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#025EB8]" />{rule}</div>)}</CardContent>
      </Card>
      <Card className="border-[#025EB8]/20 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#025EB8]" /> AI لاحقًا</CardTitle>
          <CardDescription className="leading-6">سيقرأ AI لاحقًا المواسم والخطط والمهام ليقترح أولويات أسبوعية، مسودات محتوى، وتحذيرات تشغيلية قبل التأخير.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  </div>;
}
