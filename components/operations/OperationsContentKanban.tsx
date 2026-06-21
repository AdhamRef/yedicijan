import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationsOverview } from "@/lib/operations/types";

type BoardColumn = readonly [status: string, label: string, description: string];

type OperationsContentKanbanProps = {
  items: OperationsOverview["items"];
  boardColumns: readonly BoardColumn[];
  statusClass: Record<string, string>;
};

export function OperationsContentKanban({ items, boardColumns, statusClass }: OperationsContentKanbanProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>مراحل إنتاج المحتوى</CardTitle>
        <CardDescription>Kanban يقرأ الآن من API overview، وسيتم استبدال مصدره لاحقًا بقاعدة البيانات.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 xl:grid-cols-5">
          {boardColumns.map(([status, label, description]) => {
            const columnItems = items.filter((item) => item.status === status);

            return (
              <div key={status} className="rounded-2xl border bg-slate-50 p-3">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-900">{label}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                  </div>
                  <Badge variant="outline" className={statusClass[status]}>{columnItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  {columnItems.map((item) => (
                    <div key={item.id || item.title} className="rounded-xl border bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold leading-6 text-slate-900">{item.title}</h4>
                        <Badge variant="outline" className={statusClass[item.status]}>{item.type}</Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        <p>القناة: <b>{item.channel}</b></p>
                        <p>الموعد: <b>{item.due}</b></p>
                      </div>
                    </div>
                  ))}
                  {columnItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed bg-white p-3 text-center text-xs text-slate-400">لا توجد عناصر حالية</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
