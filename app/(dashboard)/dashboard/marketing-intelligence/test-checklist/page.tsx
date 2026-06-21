import Link from "next/link";
import { CheckCircle2, FlaskConical, MousePointerClick, ReceiptText, Route, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const groups = [
  {
    title: "اختبار تحميل التتبع",
    icon: Route,
    items: [
      "افتح الصفحة الرئيسية وتأكد أن الموقع لا يظهر أخطاء JavaScript في Console.",
      "انتقل بين الصفحات داخليًا وتأكد أن التنقل لا يكسر واجهة الموقع.",
      "افتح مركز التسويق وتأكد أن Health API يحمل البيانات.",
    ],
  },
  {
    title: "اختبار رابط حملة",
    icon: MousePointerClick,
    items: [
      "أنشئ رابط حملة من الروابط التسويقية.",
      "افتح الرابط في نافذة جديدة مع UTM وplatform/campaign parameters.",
      "ابدأ تبرعًا وتأكد أن attribution لا يضيع عند الانتقال بين الصفحات.",
    ],
  },
  {
    title: "اختبار تبرع تجريبي",
    icon: ReceiptText,
    items: [
      "نفذ تبرعًا تجريبيًا حتى صفحة النجاح.",
      "تأكد أن صفحة النجاح تظهر الإيصال والبيانات الصحيحة.",
      "افتح سجل التحويلات وابحث عن donationId الخاص بالتبرع.",
    ],
  },
  {
    title: "اختبار التحويل النهائي",
    icon: ShieldCheck,
    items: [
      "تأكد من وجود Meta server event بحالة SENT إن كانت إعدادات Meta مكتملة.",
      "تأكد من عدم تكرار Meta browser Donate لنفس eventId.",
      "لو ظهر نقص، استخدم مركز إصلاح التحويلات بدل إعادة تنفيذ تبرع جديد.",
    ],
  },
  {
    title: "اختبار المنصات",
    icon: FlaskConical,
    items: [
      "راجع صفحة حالة المنصات لمعرفة ما هو live أو partial أو planned.",
      "لا تتوقع سحب بيانات Google Ads أو TikTok قبل تنفيذ sync clients الخاصة بهم.",
      "استخدم Meta كأول منصة مقارنة لأنها الأكثر اكتمالًا حاليًا.",
    ],
  },
];

export default function MarketingTestChecklistPage() {
  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <FlaskConical className="h-3.5 w-3.5" />
            اختبار النظام
          </div>
          <h1 className="mt-3 text-2xl font-black text-slate-900">قائمة فحص التتبع والإعلانات</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            استخدم هذه الصفحة بعد أي deploy أو تعديل في التتبع أو قبل إطلاق حملة جديدة. الهدف هو اختبار الرحلة كاملة من الرابط إلى التبرع والتحويل.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/dashboard/marketing-intelligence/system-map">خريطة النظام</Link>
          <Link className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/dashboard/conversion-events">سجل التحويلات</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-blue-50 p-3 text-[#025EB8]"><Icon className="h-5 w-5" /></span>
                  <div>
                    <CardTitle>{group.title}</CardTitle>
                    <CardDescription>خطوات تشغيلية واضحة للفريق.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
