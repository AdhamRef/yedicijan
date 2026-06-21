import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Database, Megaphone, Rocket, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const completed = [
  "مركز العمليات الرئيسي",
  "لوحة خطط المحتوى",
  "التقويم التشغيلي والمواسم",
  "خطة المحاور الأسبوعية",
  "Kanban لمراحل الإنتاج",
  "مهام الإنتاج",
  "Placeholder للتسليم للتسويق",
] as const;

const active = [
  "Package 4A: تأسيس نماذج البيانات",
  "OperationSeason",
  "OperationWeeklyTheme",
  "ContentPlan",
  "ContentItem",
  "ContentTask",
] as const;

const next = [
  "قراءة البيانات الحقيقية بدل البيانات الثابتة",
  "CRUD للخطط والعناصر والمهام",
  "التنبيهات والتذكير بالمواسم",
  "جدولة WhatsApp / Email / SMS",
  "AI Suggestions للمحتوى والحملات",
  "Marketing Handoff مع روابط الحملات ونتائج الإعلانات",
] as const;

const progress = [
  ["UI Shell", 100, "مكتمل"],
  ["Data Foundation", 10, "مفتوح"],
  ["CRUD", 0, "لاحقًا"],
  ["Automation", 0, "لاحقًا"],
  ["AI", 0, "لاحقًا"],
] as const;

const packages = [
  ["Package 3A-3D", "واجهة النظام", "مكتمل", "تم بناء مركز العمليات، لوحة المحتوى، المواسم، المهام، وKanban."],
  ["Package 4A", "نماذج البيانات", "مفتوح", "Issue #21 جاهز لتنفيذ نماذج Prisma بشكل آمن ومنفصل."],
  ["Package 4B", "Read APIs", "التالي", "قراءة المواسم والخطط والعناصر والمهام من قاعدة البيانات."],
  ["Package 4C", "ربط الواجهة بالبيانات", "التالي", "استبدال البيانات الثابتة داخل اللوحة ببيانات حقيقية."],
  ["Package 4D", "CRUD", "لاحقًا", "إضافة وتعديل الخطط والعناصر والمهام من داخل لوحة التحكم."],
  ["Package 4E", "Marketing Handoff", "لاحقًا", "تسليم المحتوى المعتمد للتسويق وربطه بروابط الحملات ونتائج الإعلانات."],
] as const;

export default function OperationsSystemPage() {
  return (
    <div className="space-y-5 p-4 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-l from-slate-950 to-[#025EB8] p-5 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-white/70">Operations / System</p>
          <h1 className="mt-1.5 text-2xl font-black">تنفيذ النظام</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/85">
            هذه الصفحة تعرض حالة تنفيذ نظام العمليات داخل لوحة التحكم نفسها: ما تم، ما يجري الآن، وما سيتم بناؤه لاحقًا.
          </p>
        </div>
        <Button asChild variant="secondary" className="gap-2 font-bold">
          <Link href="/dashboard/operations">
            العودة لمركز العمليات <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {progress.map(([label, value, state]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}%</CardTitle>
              <Badge variant="outline" className="w-fit">{state}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-[#025EB8]/20 bg-blue-50/50">
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-[#025EB8]" /> Package 4A مفتوح الآن</CardTitle>
            <CardDescription className="mt-2 leading-6">تم توثيق نماذج البيانات المطلوبة في Issue #21، والهدف التالي هو تنفيذها في Prisma ثم التحقق والبناء.</CardDescription>
          </div>
          <Link href="https://github.com/AdhamRef/gozbebekleri/issues/21" target="_blank" className="inline-flex rounded-md bg-[#025EB8] px-4 py-2 text-sm font-bold text-white hover:bg-[#024f99]">
            فتح Issue #21
          </Link>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>خارطة الحزم التنفيذية</CardTitle>
          <CardDescription>تسلسل العمل من الواجهة الحالية إلى نظام بيانات وتشغيل كامل.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packages.map(([code, title, state, description]) => (
            <div key={code} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#025EB8]">{code}</p>
                  <h3 className="mt-1 font-black text-slate-900">{title}</h3>
                </div>
                <Badge variant="outline">{state}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> تم إنجازه</CardTitle>
            <CardDescription>أجزاء أصبحت ظاهرة داخل لوحة التحكم.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {completed.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border bg-emerald-50/50 p-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-[#025EB8]" /> الجاري الآن</CardTitle>
            <CardDescription>المرحلة التالية لتحويل الواجهة إلى بيانات حقيقية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {active.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border bg-blue-50/50 p-3 text-sm text-slate-700">
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[#025EB8]" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-amber-600" /> القادم</CardTitle>
            <CardDescription>ما سيجعل النظام قابلًا للاستخدام اليومي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {next.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border bg-amber-50/50 p-3 text-sm text-slate-700">
                <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#025EB8]" /> قاعدة العمل من الآن</CardTitle>
          <CardDescription>أي مرحلة جديدة سيتم إظهارها داخل اللوحة قبل أو مع تنفيذها، حتى تكون المراجعة من داخل النظام نفسه.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-slate-700">
          <p>
            لن نترك التنفيذ مخفيًا في GitHub فقط. كل حزمة قادمة سيكون لها أثر واضح داخل لوحة التحكم: إما صفحة، أو مؤشر تقدم، أو قسم متابعة، أو حالة تنفيذ.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
