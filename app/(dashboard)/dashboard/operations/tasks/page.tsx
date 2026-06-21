import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, ListChecks, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskOverview } from "@/lib/operations/tasks/task-service";

const priorityClass: Record<string, string> = {
  HIGH: "border-rose-200 bg-rose-50 text-rose-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  LOW: "border-slate-200 bg-slate-50 text-slate-700",
};

const statusLabel: Record<string, string> = {
  PENDING: "بانتظار التنفيذ",
  IN_PROGRESS: "قيد التنفيذ",
  BLOCKED: "محجوبة",
  DONE: "منتهية",
};

const statusClass: Record<string, string> = {
  PENDING: "border-slate-200 bg-slate-50 text-slate-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  BLOCKED: "border-rose-200 bg-rose-50 text-rose-700",
  DONE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function OperationsTasksPage() {
  const overview = getTaskOverview();

  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Operations / Production Tasks</p>
          <h1 className="mt-1.5 text-2xl font-black">مهام الإنتاج</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            تحويل الخطة المقترحة إلى مهام تشغيل قابلة للمتابعة. مصدر البيانات: {overview.source}.
          </p>
        </div>
        <Link href="/dashboard/operations/calendar" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#025EB8] shadow-sm hover:bg-white/90">
          فتح التقويم والتنبيهات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card><CardHeader><CardDescription>إجمالي المهام</CardDescription><CardTitle className="text-3xl">{overview.summary.totalTasks}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>بانتظار التنفيذ</CardDescription><CardTitle className="text-3xl">{overview.summary.pending}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>قيد التنفيذ</CardDescription><CardTitle className="text-3xl">{overview.summary.inProgress}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>محجوبة</CardDescription><CardTitle className="text-3xl">{overview.summary.blocked}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>منتهية</CardDescription><CardTitle className="text-3xl">{overview.summary.done}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>أولوية عالية</CardDescription><CardTitle className="text-3xl">{overview.summary.highPriority}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-[#025EB8]" /> قائمة مهام الإنتاج</CardTitle>
          <CardDescription>نسخة تأسيسية تقرأ من Task Engine. لاحقًا سيتم ربطها بقاعدة البيانات، المسؤولين، والتقدم الفعلي.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {overview.tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">{task.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{task.sourceReason}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={priorityClass[task.priority]}>{task.priority}</Badge>
                  <Badge variant="outline" className={statusClass[task.status]}>{statusLabel[task.status]}</Badge>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#025EB8]" /> {task.assignee}</span>
                <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#025EB8]" /> {task.dueLabel}</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#025EB8]" /> {task.progress}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#025EB8]/20 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#025EB8]" /> القادم</CardTitle>
          <CardDescription className="leading-6">
            بعد اعتماد هذه الطبقة، سيتم ربط المهام بعناصر المحتوى، ثم بناء مساعد AI يقرأ المواسم والخطط والمهام ويقترح أولويات التنفيذ.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
