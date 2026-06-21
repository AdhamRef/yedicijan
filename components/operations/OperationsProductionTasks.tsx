import { PlusCircle, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationsOverview } from "@/lib/operations/types";

type OperationsProductionTasksProps = {
  tasks: OperationsOverview["tasks"];
  statusClass: Record<string, string>;
};

export function OperationsProductionTasks({ tasks, statusClass }: OperationsProductionTasksProps) {
  return (
    <Card>
      <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserRoundCheck className="h-5 w-5 text-[#025EB8]" /> مهام الإنتاج
          </CardTitle>
          <CardDescription className="mt-2">تصور أولي لتوزيع المسؤوليات والمواعيد قبل ربط المهام بقاعدة البيانات.</CardDescription>
        </div>
        <Button variant="outline" disabled className="gap-2 font-bold opacity-80">
          <PlusCircle className="h-4 w-4" /> إضافة مهمة قريبًا
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id || task.title} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">{task.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">مرتبط بـ: {task.item}</p>
                </div>
                <Badge variant="outline" className={statusClass[task.status]}>{task.status}</Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <span>المسؤول: <b>{task.owner}</b></span>
                <span>موعد التسليم: <b>{task.due}</b></span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
