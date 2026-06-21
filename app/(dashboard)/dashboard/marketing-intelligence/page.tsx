import Link from "next/link";
import { BarChart3, GitCompareArrows, PlugZap, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const mainSections = [
  {
    title: "ربط المنصات",
    href: "/dashboard/marketing/connections",
    icon: PlugZap,
    description: "إدارة حسابات Meta وGoogle وTikTok وGA4 وWhatsApp وغيرها، ومعرفة حالة الربط وآخر مزامنة.",
    useFor: "استخدمها عند إضافة حساب إعلاني أو إصلاح مشكلة سحب الصرف والنتائج.",
  },
  {
    title: "الإعلانات والتوصيات",
    href: "/dashboard/marketing-intelligence/ads-recommendations",
    icon: BarChart3,
    description: "صفحة تشغيلية خفيفة تعرض الصرف، التبرعات، ROAS، الحسابات، آخر مزامنة، وأهم التنبيهات.",
    useFor: "استخدمها يوميًا لمعرفة هل الإعلانات رابحة وما الذي يحتاج انتباه.",
  },
];

const technicalLinks = [
  { title: "إصلاح التحويلات", href: "/dashboard/marketing-intelligence/repair-center", icon: Wrench, desc: "إعادة فحص التحويلات الناقصة أو غير المرسلة." },
  { title: "سجل أحداث التحويل", href: "/dashboard/conversion-events", icon: ShieldCheck, desc: "كل محاولات إرسال التحويلات للمنصات." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", icon: GitCompareArrows, desc: "مقارنة تبرعات الموقع مع أرقام المنصات." },
  { title: "استيراد بيانات المنصات", href: "/dashboard/marketing-intelligence/platform-metrics/import", icon: PlugZap, desc: "إدخال بيانات الصرف والنتائج يدويًا عند الحاجة." },
  { title: "إعدادات التتبع والبكسلات", href: "/dashboard/pixels", icon: Settings2, desc: "إعداد Pixel IDs وTokens وقياسات التتبع." },
];

export default function MarketingIntelligencePage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="rounded-3xl border bg-gradient-to-l from-[#025EB8] to-[#01396f] p-6 text-white shadow-sm">
      <p className="text-sm text-white/75">التتبع والإعلانات</p>
      <h1 className="mt-2 text-3xl font-black">خريطة النظام</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">مدخل مبسط يشرح الصفحات الداخلية غير اليومية. الصفحات الظاهرة خارج الخريطة مثل الإعلانات وإنشاء الروابط لا نكررها هنا حتى تبقى القائمة واضحة.</p>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {mainSections.map((section) => {
        const Icon = section.icon;
        return <Link key={section.href} href={section.href} className="block">
          <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-blue-50 p-3 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
                <div><CardTitle>{section.title}</CardTitle><CardDescription className="mt-1 leading-6">{section.description}</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent><div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><b>متى تستخدمها؟</b> {section.useFor}</div></CardContent>
          </Card>
        </Link>;
      })}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>روابط داخلية للإصلاح والتفاصيل</CardTitle>
        <CardDescription>هذه ليست صفحات يومية. استخدمها فقط عند وجود مشكلة أو حاجة لتشخيص أعمق.</CardDescription>
      </CardHeader>
      <CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {technicalLinks.map((link) => {
          const Icon = link.icon;
          return <Link key={link.href} href={link.href} className="rounded-xl border bg-white p-4 transition hover:border-blue-200 hover:bg-slate-50">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2 text-slate-700"><Icon className="h-4 w-4" /></span><div><div className="font-bold text-slate-900">{link.title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{link.desc}</div></div></div>
          </Link>;
        })}
      </div></CardContent>
    </Card>
  </div>;
}
