import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationsOverview } from "@/lib/operations/types";

type OperationsSeasonsBoardProps = {
  seasons: OperationsOverview["seasons"];
  weeklyThemes: OperationsOverview["weeklyThemes"];
  statusClass: Record<string, string>;
};

export function OperationsSeasonsBoard({ seasons, weeklyThemes, statusClass }: OperationsSeasonsBoardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#025EB8]" /> التقويم التشغيلي والمواسم
        </CardTitle>
        <CardDescription>نظرة واحدة على المواسم والمحاور التي تقود إنتاج المحتوى خلال الشهر أو الموسم.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-5">
          {seasons.map((season) => (
            <div key={season.id || season.title} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">{season.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{season.focus}</p>
                </div>
                <Badge variant="outline" className={statusClass[season.status]}>{season.status}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <p>الفترة: <b>{season.period}</b></p>
                <p>المواد: <b>{season.ready}</b> جاهزة من <b>{season.required}</b></p>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#025EB8]" style={{ width: `${season.progress}%` }} />
                </div>
                <p className="text-left font-bold text-slate-700">{season.progress}%</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-black text-slate-900">خطة المحاور الشهرية</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {weeklyThemes.map((theme) => (
              <div key={theme.id || theme.week} className="rounded-xl border bg-slate-50 p-3">
                <p className="text-xs font-bold text-[#025EB8]">{theme.week}</p>
                <h4 className="mt-1 font-black text-slate-900">{theme.theme}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">{theme.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
