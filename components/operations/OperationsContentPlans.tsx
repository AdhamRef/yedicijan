import { FileText, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationsOverview } from "@/lib/operations/types";

type Props = {
  plans: OperationsOverview['plans'];
  items: OperationsOverview['items'];
  statusClass: Record<string,string>;
};

export function OperationsContentPlans({ plans, items, statusClass }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-[#025EB8]" /> خطط المحتوى</CardTitle>
          <CardDescription>نماذج تقرأ الآن من API overview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id || plan.title} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-black text-slate-900">{plan.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{plan.theme}</p></div>
                <Badge variant="outline" className={statusClass[plan.status]}>{plan.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-[#025EB8]" /> عناصر المحتوى</CardTitle>
          <CardDescription>قائمة مختصرة بجانب Kanban.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.id || item.title} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <Badge variant="outline" className={statusClass[item.status]}>{item.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
