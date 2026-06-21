import Link from "next/link";
import { BarChart3, Bot, CheckCircle2, Database, Link2, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MARKETING_OPERATING_FLOW, MARKETING_TRUTH_SOURCES } from "@/lib/marketing/operating-flow";
import { MarketingHealthSummary } from "./_components/MarketingHealthSummary";
import { MarketingPageHeader } from "./_components/MarketingPageHeader";
import { MarketingQuickNav } from "./_components/MarketingQuickNav";

const toolIcons = [PlugZap, Link2, ShieldCheck, BarChart3, Sparkles] as const;

const secondaryTools = [
  {
    title: "AI Assistant API",
    href: "/dashboard/marketing/ai-assistant",
    icon: Bot,
    description: "إضافة مفاتيح الذكاء الاصطناعي وتجهيز تحليل الحملات والتوصيات.",
    action: "فتح إعداد AI",
  },
  {
    title: "سحب البيانات",
    href: "/dashboard/marketing/data-sync",
    icon: Database,
    description: "تشغيل مزامنة Meta وGoogle وGA4 وTikTok وWhatsApp بفترات واضحة.",
    action: "فتح Data Sync",
  },
  {
    title: "Google Ads Deep Data",
    href: "/dashboard/marketing/google-ads",
    icon: BarChart3,
    description: "الكلمات، عبارات البحث، العناوين، الأصول، وروابط الهبوط.",
    action: "فتح Google Deep Data",
  },
];

const nextActions = [
  ["راجع الجاهزية", "ابدأ من الربط والتتبع إذا كانت المنصات أو البكسلات ناقصة."],
  ["أنشئ رابط حملة", "استخدم Link Generator كـ Campaign Builder الرسمي ولا تنشئ روابط عشوائية."],
  ["افحص التحويلات", "افتح Quality قبل قرارات الميزانية إذا ظهرت أخطاء أو تحويلات ناقصة."],
  ["حلل الأداء", "استخدم Insights لمعرفة الصرف، التبرعات، ROAS، وأهم توصية اليوم."],
] as const;

const marketingBoundaries = [
  ["يبقى داخل Marketing", "الربط، التتبع، الروابط، سحب البيانات، جودة التحويلات، الأداء والتوصيات الأولية."],
  ["ينتقل لاحقًا إلى Operations", "خطة المحتوى، مهام الفريق، التقويم، النشر، الرسائل، وربط المحتوى بالأداء."],
  ["ينتقل لاحقًا إلى Archive", "Google Drive، تحليل الصور والفيديو، مراجعة الأصول، واختيار مواد تصلح للتسويق."],
] as const;

export default function MarketingHomePage() {
  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <MarketingPageHeader
      title="مركز التسويق والنمو"
      description="رحلة واحدة لإدارة الربط، الروابط، التحويلات، الأداء، والتوصيات. الهدف هنا ترتيب الأدوات الحالية حتى يعرف الفريق من أين يبدأ وماذا يفعل بعد ذلك."
    />

    <MarketingQuickNav />

    <MarketingHealthSummary />

    <Card>
      <CardHeader>
        <CardTitle>رحلة التشغيل الرسمية</CardTitle>
        <CardDescription>اتبع هذا الترتيب عند تشغيل أو مراجعة أي حملة. كل مرحلة تستخدم أدوات موجودة بالفعل.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-5">
        {MARKETING_OPERATING_FLOW.map((tool, index) => {
          const Icon = toolIcons[index] ?? PlugZap;
          return <Link key={tool.step} href={tool.href} className="block">
            <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{tool.step}</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
                </div>
                <CardTitle className="text-base">{tool.subtitle}</CardTitle>
                <CardDescription className="leading-6">{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">المصدر: {tool.source}</div>
                <span className="inline-flex rounded-md bg-[#025EB8] px-3 py-2 text-sm font-semibold text-white">{tool.action}</span>
              </CardContent>
            </Card>
          </Link>;
        })}
      </CardContent>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>ماذا أفعل الآن؟</CardTitle>
          <CardDescription>خطوات تشغيل مختصرة تمنع الانتقال بين الصفحات بشكل عشوائي.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextActions.map(([title, body]) => <div key={title} className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900"><CheckCircle2 className="h-4 w-4 text-[#025EB8]" />{title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </div>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>حدود نظام التسويق</CardTitle>
          <CardDescription>هذه الحدود تمنع تضخم Marketing عند بناء Operations وArchive لاحقًا.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {marketingBoundaries.map(([title, body]) => <div key={title} className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </div>)}
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      {secondaryTools.map((tool) => {
        const Icon = tool.icon;
        return <Link key={tool.href} href={tool.href} className="block">
          <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
            <CardHeader>
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription className="leading-6">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent><span className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">{tool.action}</span></CardContent>
          </Card>
        </Link>;
      })}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>مصادر الحقيقة داخل نظام التسويق</CardTitle>
        <CardDescription>هذه القاعدة تمنع تكرار الجداول والداشبوردات عند ربط Operations وArchive لاحقًا.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-5">
        {MARKETING_TRUTH_SOURCES.map(([label, source]) => <div key={label} className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{source}</p>
        </div>)}
      </CardContent>
    </Card>
  </div>;
}
