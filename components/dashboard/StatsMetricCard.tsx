"use client";

import { useEffect, useState } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { DASHBOARD_DISPLAY_SYMBOLS } from "@/lib/dashboard/format-dashboard-money";

type Accent = "emerald" | "teal" | "amber" | "orange" | "violet" | "indigo" | "slate" | "blue" | "rose" | "sky";
const ACCENT_CLASSES: Record<Accent, { bg: string; icon: string; badge: string }> = {
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600", badge: "bg-teal-100 text-teal-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  slate: { bg: "bg-slate-50", icon: "text-slate-500", badge: "bg-slate-100 text-slate-600" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  rose: { bg: "bg-rose-50", icon: "text-rose-600", badge: "bg-rose-100 text-rose-700" },
  sky: { bg: "bg-sky-50", icon: "text-sky-600", badge: "bg-sky-100 text-sky-700" },
};

function formatValue(value: number, format?: "money" | "number" | "percent"): string {
  const latn = (n: number, options?: Intl.NumberFormatOptions) => n.toLocaleString("en-US", { numberingSystem: "latn", ...options });
  if (format === "money") return `$${latn(value, { maximumFractionDigits: 2 })}`;
  if (format === "percent") return `${value.toFixed(1)}%`;
  return latn(value, { maximumFractionDigits: 0 });
}
function formatCurrency(value: number | undefined, currency: string): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${safeValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}
function formatSelectedCurrency(value: number, currency: string) {
  const sym = DASHBOARD_DISPLAY_SYMBOLS[currency] ?? `${currency} `;
  return sym + value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function currencyBreakdown(totals?: Record<string, number>) {
  const entries = Object.entries(totals ?? {}).filter(([, value]) => typeof value === "number" && value > 0);
  if (!entries.length) return "لا توجد حوالات معتمدة بعد";
  return entries.map(([currency, amount]) => formatCurrency(amount, currency)).join(" • ");
}

type BankTransfersSummary = { totals?: Record<string, number>; usdTotals?: Record<string, number>; totalUsd?: number; approvedCount?: number; pendingCount?: number };
interface StatsMetricCardProps { title: string; value: number; icon: LucideIcon; accent?: Accent; format?: "money" | "number" | "percent"; subtitle?: string; compact?: boolean; variant?: "default" | "hero"; }

export function StatsMetricCard({ title, value, icon: Icon, accent = "slate", format, subtitle, compact, variant = "default" }: StatsMetricCardProps) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.slate;
  const isHero = variant === "hero";
  const shouldShowBankTransfers = title.includes("إيرادات ناجحة") && title.includes("كل الوقت");
  const [bankSummary, setBankSummary] = useState<BankTransfersSummary | null>(null);
  const { convertToCurrency, getSelectedCurrency } = useCurrency();

  useEffect(() => {
    if (!shouldShowBankTransfers) return;
    let cancelled = false;
    fetch("/api/admin/bank-transfers/summary").then((res) => (res.ok ? res.json() : null)).then((data) => { if (!cancelled) setBankSummary(data); }).catch(() => { if (!cancelled) setBankSummary(null); });
    return () => { cancelled = true; };
  }, [shouldShowBankTransfers]);

  const selectedCurrency = getSelectedCurrency?.() ?? "DEFAULT";
  const selectedCode = selectedCurrency === "DEFAULT" ? "USD" : selectedCurrency;
  const bankUsd = bankSummary?.totalUsd ?? bankSummary?.totals?.USD ?? 0;
  const bankDisplayValue = selectedCurrency === "DEFAULT" ? bankUsd : (convertToCurrency(bankUsd)?.convertedValue ?? bankUsd);
  const displayedValue = shouldShowBankTransfers && format === "money" ? value + bankDisplayValue : value;
  const displayedSubtitle = shouldShowBankTransfers ? `الموقع: ${formatSelectedCurrency(value, selectedCode)} • البنوك: ${formatSelectedCurrency(bankDisplayValue, selectedCode)}` : subtitle;

  const mainCard = (
    <div className={cn("rounded-xl border border-border bg-white shadow-sm flex flex-col gap-1 transition-shadow hover:shadow-md", compact ? "p-3" : "p-4", isHero && "ring-2 ring-offset-1 ring-current ring-opacity-20")}>
      <div className="flex items-start justify-between gap-2 min-w-0"><p className={cn("font-medium leading-tight text-slate-700 text-right flex-1 min-w-0", compact ? "text-[11px]" : "text-xs")}>{shouldShowBankTransfers ? "إجمالي الإيرادات: الموقع + الحسابات البنكية" : title}</p><span className={cn("rounded-lg p-1.5 shrink-0 mt-0.5", colors.bg, colors.icon)}><Icon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} /></span></div>
      <p className={cn("font-bold text-right tabular-nums text-slate-900", isHero ? "text-xl" : compact ? "text-base" : "text-lg")}>{format === "money" && shouldShowBankTransfers ? formatSelectedCurrency(displayedValue, selectedCode) : formatValue(displayedValue, format)}</p>
      {displayedSubtitle && <p className="text-[10px] text-slate-400 text-right leading-tight truncate">{displayedSubtitle}</p>}
    </div>
  );
  if (!shouldShowBankTransfers) return mainCard;
  return <>{mainCard}<div className="rounded-xl border border-border bg-white shadow-sm flex flex-col gap-1 transition-shadow hover:shadow-md p-3"><div className="flex items-start justify-between gap-2 min-w-0"><p className="font-medium leading-tight text-slate-700 text-right flex-1 min-w-0 text-[11px]">الحوالات البنكية</p><span className="rounded-lg p-1.5 shrink-0 mt-0.5 bg-blue-50 text-blue-600"><Icon className="w-3.5 h-3.5" /></span></div><p className="font-bold text-right tabular-nums text-slate-900 text-base">{formatSelectedCurrency(bankDisplayValue, selectedCode)}</p><p className="text-[10px] text-slate-400 text-right leading-tight truncate">الأصل: {currencyBreakdown(bankSummary?.totals)} • معتمد: {bankSummary?.approvedCount ?? 0} • مراجعة: {bankSummary?.pendingCount ?? 0}</p></div></>;
}
