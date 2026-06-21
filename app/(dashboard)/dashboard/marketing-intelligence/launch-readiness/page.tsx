import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Database, GitCompareArrows, Link2, Rocket, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingWorkflowHeader } from "../_components/MarketingWorkflowHeader";
import { MarketingQuickGuide } from "../_components/MarketingQuickGuide";

const groups = [
  {
    title: "1. البيانات والروابط",
    icon: Database,
    items: [
      { text: "تم إنشاء رابط تتبع منفصل لكل حملة/إعلان مهم.", href: "/dashboard/link-generator", action: "إنشاء الروابط" },
      { text: "تم التأكد أن الروابط تحتوي campaign_id أو utm_campaign واضح.", href: "/dashboard/marketing-intelligence/campaign-links", action: "مراجعة الروابط" },
      { text: "تم استيراد أو إدخال بيانات المنصات للفترة المطلوبة.", href: "/dashboard/marketing-intelligence/platform-metrics/import", action: "استيراد CSV" },
    ],
  },
  {
    title: "2. التتبع والتحويلات",
    icon: ShieldCheck,
    items: [
      { text: "إعدادات Meta / GA4 / Google Ads / TikTok مكتملة حسب المنصات المستخدمة.", href: "/dashboard/marketing-intelligence/platform-status", action: "حالة المنصات" },
      { text: "تم التأكد أن قيمة التحويل تستخدم totalAmount وليس amount فقط.", href: "/dashboard/marketing-intelligence/conversion-value-audit", action: "تدقيق القيمة" },
      { text: "لا توجد تحويلات فاشلة أو ناقصة تحتاج إصلاح قبل التوسعة.", href: "/dashboard/conversion-events", action: "سجل التحويلات" },
    ],
  },
  {
    title: "3. المقارنة والتوصيات",
    icon: GitCompareArrows,
    items: [
      { text: "تمت مقارنة بيانات الموقع ضد بيانات المنصات بعد استيراد CSV.", href: "/dashboard/marketing-intelligence/site-vs-platform", action: "فتح المقارنة" },
      { text: "تمت مراجعة توصيات الميزانية: زود/أوقف/خفّض/أصلح التتبع.", href: "/dashboard/marketing-intelligence/budget-recommendations", action: "توصيات الميزانية" },
      { text: "تم التعامل مع أي إجراء عالي الأهمية في مركز الإجراءات.", href: "/dashboard/marketing-intelligence/action-items", action: "مركز الإجراءات" },
    ],
  },
  {
    title: "4. قرار الإطلاق",
    icon: Rocket,
    items: [
      { text: "لوحة التشغيل لا تظهر مشاكل حرجة قبل الإطلاق.", href: "/dashboard/marketing-intelligence/executive-overview", action: "لوحة التشغيل" },
      { text: "الميزانية لا تزيد إلا للحملات التي يظهر فيها أثر واضح أو توصية قوية.", href: "/dashboard/marketing-intelligence/budget-recommendations", action: "قرار الميزانية" },
      { text: "بعد أول تبرع من إعلان، تتم مراجعة قيمة التحويل والإسناد فورًا.", href: "/dashboard/marketing-intelligence/conversion-value-audit", action: "مراجعة أول تبرع" },
    ],
  },
];

export default function MarketingLaunchReadinessPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <MarketingWorkflowHeader
      current="جاهزية الإطلاق"
      title="جاهزية إطلاق الحملات"
      description="Checklist نهائية قبل تشغيل أو توسيع حملات إعلانية كبيرة، لضمان أن البيانات والروابط والتتبع والتوصيات جاهزة."
    />

    <MarketingQuickGuide steps={[
      "ابدأ من البيانات والروابط: لا تطلق حملة بدون رابط تتبع واضح.",
      "راجع التدقيق والإصلاح: لا توسّع قبل التأكد من قيمة totalAmount وسلامة التحويلات.",
      "استورد CSV من المنصة ثم افتح المقارنة والتوصيات.",
      "اعتمد قرار الميزانية من لوحة التشغيل ومركز الإجراءات، لا من رقم واحد فقط.",
    ]} />

    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => <Card key={group.title} className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><group.icon className="h-5 w-5 text-[#025EB8]" />{group.title}</CardTitle>
          <CardDescription>راجع البنود وافتح القسم المرتبط عند الحاجة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {group.items.map((item) => <div key={item.text} className="rounded-xl border bg-white p-3">
            <div className="flex items-start gap-2 text-sm leading-6 text-slate-700">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#025EB8]" />
              <span className="flex-1">{item.text}</span>
            </div>
            <Link href={item.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#025EB8] hover:underline">
              {item.action} <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>)}
        </CardContent>
      </Card>)}
    </div>

    <Card className="border-emerald-200 bg-emerald-50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 text-emerald-900">
          <ClipboardCheck className="mt-1 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-black">قاعدة الإطلاق الآمن</h2>
            <p className="mt-1 text-sm leading-6">لا نزيد الميزانية اعتمادًا على منصة الإعلان فقط. القرار النهائي يكون بعد مراجعة الموقع، قيمة التحويل، جودة الإسناد، وتوصيات النظام.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>;
}
