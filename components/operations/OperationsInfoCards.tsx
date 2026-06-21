import { CheckCircle2, Clock3, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OperationsInfoCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> حدود الحزمة
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          لا توجد كتابة في قاعدة البيانات. الصفحة تقرأ من API mock آمن فقط.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#025EB8]" /> التسليم للتسويق
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          لاحقًا سيتم ربط العناصر المعتمدة بروابط الحملات ونتائج الأداء داخل Marketing.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-amber-600" /> القادم
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-slate-700">
          CRUD، صلاحيات التشغيل، سجل التغييرات، وجدولة النشر.
        </CardContent>
      </Card>
    </div>
  );
}
