import Link from "next/link";

const links = [
  ["الرئيسية", "/dashboard/marketing"],
  ["التتبع", "/dashboard/marketing/tracking-hub"],
  ["الربط", "/dashboard/marketing/connections"],
  ["سحب البيانات", "/dashboard/marketing/data-sync"],
  ["الجودة", "/dashboard/marketing/quality"],
  ["التحليلات", "/dashboard/marketing/insights"],
  ["التحويلات", "/dashboard/conversion-events"],
] as const;

export function MarketingQuickNav() {
  return <div className="overflow-x-auto rounded-2xl border bg-white p-2 shadow-sm">
    <div className="flex min-w-max gap-2">
      {links.map(([label, href]) => <Link key={href} href={href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#025EB8]">
        {label}
      </Link>)}
    </div>
  </div>;
}
