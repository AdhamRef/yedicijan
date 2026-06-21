import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OperationsFiltersProps = {
  filters: readonly string[];
};

export function OperationsFilters({ filters }: OperationsFiltersProps) {
  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#025EB8]" /> فلاتر التشغيل
          </CardTitle>
          <CardDescription className="mt-2">فلاتر شكلية الآن، وسيتم تفعيلها عند ربط CRUD.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Badge key={filter} variant="outline" className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {filter}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" /> البحث في العناصر والخطط سيتم تفعيله بعد CRUD.
        </div>
      </CardContent>
    </Card>
  );
}
