import Link from "next/link";
import { Bot, Megaphone, MousePointerClick, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketingPageHeader } from "../_components/MarketingPageHeader";
import { MarketingQuickNav } from "../_components/MarketingQuickNav";

const setupLinks = [
  {
    title: "البكسل والتتبع",
    desc: "إعداد Meta Pixel وGA4 وGoogle Ads Conversion وTikTok وX من مكان واحد.",
    href: "/dashboard/pixels",
    action: "فتح البكسل",
    icon: ShieldCheck,
  },
  {
    title: "إعدادات الإعلان",
    desc: "ربط حسابات Meta وGoogle وTikTok وWhatsApp وسحب بيانات الحملات والصرف.",
    href: "/dashboard/marketing/connections",
    action: "فتح إعدادات الإعلان",
    icon: Megaphone,
  },
  {
    title: "AI Assistant",
    desc: "إضافة Provider وAPI Key وModel لتفعيل تحليل البيانات والتوصيات الذكية.",
    href: "/dashboard/marketing/ai-assistant",
    action: "فتح إعداد AI",
    icon: Bot,
  },
];

export default function MarketingTrackingHubPage() {
  return <div className="space-y-5 p-4 sm:p-6" dir="rtl">
    <MarketingPageHeader
      title="الربط والـ APIs"
      description="ثلاث مداخل فقط: البكسل، إعدادات الإعلان، وAI. كل التفاصيل داخل مكانها الصحيح حتى لا تتكرر إعدادات الربط."
    />

    <MarketingQuickNav />

    <div className="grid gap-4 md:grid-cols-3">
      {setupLinks.map((item) => {
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className="block">
          <Card className="h-full transition hover:border-blue-200 hover:shadow-sm">
            <CardHeader>
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#025EB8]"><Icon className="h-6 w-6" /></span>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className="leading-6">{item.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex rounded-md bg-[#025EB8] px-3 py-2 text-sm font-semibold text-white">{item.action}</span>
            </CardContent>
          </Card>
        </Link>;
      })}
    </div>

    <Card>
      <CardHeader><CardTitle>التسلسل المختصر</CardTitle><CardDescription>بعد إعداد الربط لا تحتاج هذه الصفحة إلا نادرًا.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Step title="1. جهّز البكسلات" desc="ضع Pixel IDs وConversion IDs واختبر التتبع." />
        <Step title="2. اربط الحسابات" desc="أضف حسابات الإعلانات والرسائل وسحب البيانات." />
        <Step title="3. فعّل AI" desc="أضف مفتاح الذكاء الاصطناعي للتوصيات." />
      </CardContent>
    </Card>
  </div>;
}

function Step({ title, desc }: { title: string; desc: string }) {
  return <div className="rounded-xl border bg-slate-50 p-4"><div className="flex items-center gap-2 font-bold text-slate-900"><MousePointerClick className="h-4 w-4 text-[#025EB8]" />{title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p></div>;
}
