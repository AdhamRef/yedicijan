import Link from "next/link";
import { ArrowRight, Home, LayoutDashboard } from "lucide-react";

export function MarketingWorkflowHeader({
  title,
  description,
  current,
}: {
  title: string;
  description: string;
  current: string;
}) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <Link href="/dashboard/marketing-intelligence" className="inline-flex items-center gap-1 hover:text-[#025EB8]"><Home className="h-4 w-4" />مركز التسويق</Link>
      <span>/</span>
      <Link href="/dashboard/marketing-intelligence/executive-overview" className="inline-flex items-center gap-1 hover:text-[#025EB8]"><LayoutDashboard className="h-4 w-4" />لوحة التشغيل</Link>
      <span>/</span>
      <span className="font-medium text-slate-900">{current}</span>
    </div>
    <div className="rounded-2xl border bg-gradient-to-l from-slate-50 to-white p-5">
      <Link href="/dashboard/marketing-intelligence/executive-overview" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى لوحة التشغيل</Link>
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  </div>;
}
