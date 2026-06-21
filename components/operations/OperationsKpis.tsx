import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationsOverview } from "@/lib/operations/types";

type OperationsKpisProps = {
  kpis: OperationsOverview["kpis"];
};

export function OperationsKpis({ kpis }: OperationsKpisProps) {
  const cards = [
    ["المواسم المفتوحة", kpis.openSeasons],
    ["الخطط النشطة", kpis.activePlans],
    ["عناصر المحتوى", kpis.contentItems],
    ["مهام إنتاج مفتوحة", kpis.openProductionTasks],
    ["جاهز للتسويق", kpis.readyForMarketing],
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value]) => (
        <Card key={label}>
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-3xl">{value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
