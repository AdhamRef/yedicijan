import Link from "next/link";
import { BarChart3, GitCompareArrows, History, Settings, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingWorkflowHeader } from "../_components/MarketingWorkflowHeader";
import { MarketingQuickGuide } from "../_components/MarketingQuickGuide";

const items = [
  { title: "توصيات الميزانية", href: "/dashboard/marketing-intelligence/budget-recommendations", icon: TrendingUp, desc: "قرارات زود، أوقف، خفّض، أصلح التتبع، أو راجع." },
  { title: "سجل قرارات الميزانية", href: "/dashboard/marketing-intelligence/budget-decisions", icon: History, desc: "تسجيل ومراجعة قرارات الفريق بعد تنفيذ توصيات الميزانية." },
  { title: "مقارنة الموقع والمنصات", href: "/dashboard/marketing-intelligence/site-vs-platform", icon: GitCompareArrows, desc: "مقارنة إنفاق المنصات وتحويلاتها بتبرعات الموقع الفعلية." },
  { title: "إعدادات التتبع", href: "/dashboard/pixels", icon: Settings, desc: "إعدادات Pixel وGA4 وGoogle Ads ومنصات التتبع." },
  { title: "ربط المنصات", href: "/dashboard/marketing/connections", icon: BarChart3, desc: "إدارة ربط المنصات ومفاتيح الاتصال والتكامل." },
];

export default function MarketingDecisionsHubPage() {
  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <MarketingWorkflowHeader
      current="القرارات والتوصيات"
      title="القرارات والتوصيات"
      description="مركز اتخاذ القرار: مقارنة المنصات، توصيات الميزانية، وإعدادات الربط والتتبع."
    />
    <MarketingQuickGuide steps={[
      "افتح مقارنة الموقع والمنصات لمعرفة هل المنصة ترى نفس نتائج الموقع.",
      "راجع توصيات الميزانية لمعرفة الحملات التي يجب زيادتها أو إيقافها أو تخفيضها.",
      "اضغط تم التنفيذ داخل التوصيات لتسجيل القرار في سجل قرارات الميزانية.",
      "لو ظهرت فجوة إسناد، أصلح التتبع قبل اتخاذ قرار ميزانية نهائي.",
    ]} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <Link key={item.href} href={item.href} className="block">
        <Card className="h-full transition hover:border-[#025EB8]/40 hover:shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><item.icon className="h-5 w-5 text-[#025EB8]" />{item.title}</CardTitle></CardHeader>
          <CardContent><CardDescription className="leading-6">{item.desc}</CardDescription></CardContent>
        </Card>
      </Link>)}
    </div>
  </div>;
}
