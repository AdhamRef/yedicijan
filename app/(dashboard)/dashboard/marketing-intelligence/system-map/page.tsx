import Link from "next/link";
import { Activity, BarChart3, Link2, PlugZap, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "مركز التسويق",
    href: "/dashboard/marketing-intelligence",
    icon: Activity,
    description: "نظرة تنفيذية على صحة النظام، التحويلات، التسوية مع Meta، والتوصيات.",
    useFor: "ابدأ من هنا لمعرفة هل النظام سليم وأين توجد المشاكل.",
  },
  {
    title: "إصلاح التحويلات",
    href: "/dashboard/marketing-intelligence/repair-center",
    icon: Wrench,
    description: "إعادة فحص التبرعات المدفوعة التي لا يظهر لها إرسال Meta Server ناجح.",
    useFor: "استخدمه عندما ترى تحويلات ناقصة أو فشل في سجل التحويلات.",
  },
  {
    title: "حالة المنصات",
    href: "/dashboard/marketing-intelligence/platform-status",
    icon: PlugZap,
    description: "يوضح ما هو مكتمل وما هو جزئي أو مخطط لاحقًا في Meta وGA4 وGoogle Ads وTikTok وX.",
    useFor: "استخدمه قبل توقع نتائج من منصة معينة.",
  },
  {
    title: "الحملات والإعلانات",
    href: "/dashboard/ads",
    icon: BarChart3,
    description: "تحليل تفصيلي للحملات، المجموعات، الإعلانات، التسوية، والتوصيات.",
    useFor: "استخدمه لتقييم الأداء واتخاذ قرارات ميزانية.",
  },
  {
    title: "سجل التحويلات",
    href: "/dashboard/conversion-events",
    icon: ShieldCheck,
    description: "سجل فني لكل محاولة إرسال تحويل إلى المنصات عبر browser أو server.",
    useFor: "استخدمه لتشخيص تبرع محدد أو منصة محددة.",
  },
  {
    title: "الروابط التسويقية",
    href: "/dashboard/link-generator",
    icon: Link2,
    description: "إنشاء روابط حملات موحدة تحفظ UTM وplatform/campaign/ad identifiers.",
    useFor: "استخدمه قبل إطلاق أي حملة جديدة.",
  },
  {
    title: "إعدادات التتبع",
    href: "/dashboard/pixels",
    icon: Settings2,
    description: "إدارة Pixel IDs وقياسات التتبع الأساسية.",
    useFor: "استخدمه عند إضافة أو تعديل إعدادات البكسلات.",
  },
];

export default function MarketingSystemMapPage() {
  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          خريطة النظام
        </div>
        <h1 className="mt-3 text-2xl font-black text-slate-900">خريطة نظام التتبع والإعلانات</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          هذه الصفحة تبسط النظام وتوضح وظيفة كل قسم ومتى تستخدمه، حتى يبقى النظام مفهومًا أثناء التطوير والتشغيل.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="block">
              <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="rounded-2xl bg-blue-50 p-3 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
                    <div>
                      <CardTitle>{section.title}</CardTitle>
                      <CardDescription className="mt-1 leading-6">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>متى تستخدمه؟</b> {section.useFor}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
