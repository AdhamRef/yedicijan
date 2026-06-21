"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardList, Database, DollarSign, GitCompareArrows, Link2, Loader2, Map, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Wrench, Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Health = { scores: { readiness: number; delivery: number; overall: number }; donations: { paidLast7d: number; missingServerConversions: number }; conversionEvents: { sentLast7d: number; failedLast7d: number; skippedLast7d: number } };
type ActionItems = { ok: boolean; generatedAt: string; summary: { total: number; high: number; medium: number; low: number }; items: Array<{ id: string; priority: "HIGH" | "MEDIUM" | "LOW"; type: string; title: string; action: string; href: string }> };
type LinksPerformance = { ok: boolean; summary: { links: number; linksWithDonations: number; donationsConsidered: number; revenueMatched: number }; links: Array<{ id: string; name: string; platform: string | null; performance: { donations: number; revenue: number }; recommendation?: { tone: string; label: string; action: string } }> };
type ValueAudit = { ok: boolean; total: number; undercounted: number; needsRecheck: number; withExtraSupport: number; rows: Array<{ donationId: string; currency: string; baseAmount: number; teamSupport: number; fees: number; totalAmount: number; expectedConversionValue: number; missingFromBase: number; verdict: string }> };
type SiteVsPlatform = { ok: boolean; summary: { spend: number; platformConversions: number; platformRevenue: number; siteDonations: number; siteRevenue: number; platformRoas: number; siteRoas: number; donationGap: number; revenueGap: number }; rows: Array<{ id: string; platform: string; campaignName: string | null; campaignId: string | null; platformMetrics: { spend: number; conversions: number; revenue: number; roas: number }; siteMetrics: { donations: number; revenue: number; roas: number }; gaps: { donationGap: number; revenueGap: number; roasGap: number }; verdict: { tone: string; label: string; action: string } }> };
type BudgetRecommendations = { ok: boolean; summary: { total: number; scale: number; pause: number; reduce: number; fixTracking: number; spend: number; siteRevenue: number; siteRoas: number }; recommendations: Array<{ id: string; priority: "HIGH" | "MEDIUM" | "LOW"; decision: "SCALE" | "HOLD" | "REDUCE" | "PAUSE" | "FIX_TRACKING" | "REVIEW"; title: string; reason: string; action: string; href: string; metrics: { spend?: number; siteRevenue?: number; siteRoas?: number; platformConversions?: number; siteDonations?: number } }> };

function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"; }
function scoreTone(value: number) { if (value >= 85) return "text-emerald-700"; if (value >= 60) return "text-amber-700"; return "text-rose-700"; }
function priorityClass(priority: string) { if (priority === "HIGH") return "border-rose-200 bg-rose-50 text-rose-800"; if (priority === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-800"; return "border-emerald-200 bg-emerald-50 text-emerald-800"; }
function priorityLabel(priority: string) { if (priority === "HIGH") return "عاجل"; if (priority === "MEDIUM") return "متوسط"; return "منخفض"; }
function decisionLabel(decision: string) { if (decision === "SCALE") return "زود"; if (decision === "PAUSE") return "أوقف"; if (decision === "REDUCE") return "خفّض"; if (decision === "FIX_TRACKING") return "أصلح التتبع"; if (decision === "HOLD") return "ثبّت"; return "راجع"; }
function decisionClass(decision: string) { if (decision === "SCALE") return "border-emerald-200 bg-emerald-50 text-emerald-800"; if (decision === "PAUSE" || decision === "REDUCE") return "border-rose-200 bg-rose-50 text-rose-800"; if (decision === "FIX_TRACKING") return "border-amber-200 bg-amber-50 text-amber-800"; return "border-slate-200 bg-slate-50 text-slate-700"; }
function decisionIcon(decision: string) { if (decision === "SCALE") return <TrendingUp className="h-4 w-4" />; if (decision === "PAUSE" || decision === "REDUCE") return <TrendingDown className="h-4 w-4" />; if (decision === "FIX_TRACKING") return <Wrench className="h-4 w-4" />; return <AlertTriangle className="h-4 w-4" />; }

const workflowShortcuts = [
  { title: "مركز الإجراءات", href: "/dashboard/marketing-intelligence/action-items", icon: ClipboardList, desc: "ما الذي يجب تنفيذه الآن؟" },
  { title: "البيانات والروابط", href: "/dashboard/marketing-intelligence/data", icon: Database, desc: "استيراد بيانات المنصات والروابط." },
  { title: "التدقيق والإصلاح", href: "/dashboard/marketing-intelligence/audit", icon: ShieldCheck, desc: "فحص التحويلات والإصلاح." },
  { title: "القرارات والتوصيات", href: "/dashboard/marketing-intelligence/decisions", icon: GitCompareArrows, desc: "قرارات الميزانية والمقارنة." },
  { title: "خريطة النظام", href: "/dashboard/marketing-intelligence/system-map", icon: Map, desc: "فهم تدفق النظام بالكامل." },
];

export default function MarketingExecutiveOverviewPage() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [actions, setActions] = React.useState<ActionItems | null>(null);
  const [links, setLinks] = React.useState<LinksPerformance | null>(null);
  const [audit, setAudit] = React.useState<ValueAudit | null>(null);
  const [comparison, setComparison] = React.useState<SiteVsPlatform | null>(null);
  const [budget, setBudget] = React.useState<BudgetRecommendations | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, actionsRes, linksRes, auditRes, comparisonRes, budgetRes] = await Promise.all([
        fetch("/api/admin/marketing-intelligence/health", { cache: "no-store" }),
        fetch("/api/admin/marketing-intelligence/action-items", { cache: "no-store" }),
        fetch("/api/admin/marketing-intelligence/campaign-links/performance?status=ACTIVE&platform=ALL&days=7&limit=100", { cache: "no-store" }),
        fetch("/api/admin/marketing-intelligence/conversion-value-audit?days=7&limit=100", { cache: "no-store" }),
        fetch("/api/admin/marketing-intelligence/site-vs-platform?platform=ALL&days=7", { cache: "no-store" }),
        fetch("/api/admin/marketing-intelligence/budget-recommendations?platform=ALL&days=7", { cache: "no-store" }),
      ]);
      if (!healthRes.ok || !actionsRes.ok || !linksRes.ok || !auditRes.ok || !comparisonRes.ok || !budgetRes.ok) throw new Error("failed");
      setHealth((await healthRes.json()) as Health);
      setActions((await actionsRes.json()) as ActionItems);
      setLinks((await linksRes.json()) as LinksPerformance);
      setAudit((await auditRes.json()) as ValueAudit);
      setComparison((await comparisonRes.json()) as SiteVsPlatform);
      setBudget((await budgetRes.json()) as BudgetRecommendations);
    } catch {
      toast.error("تعذر تحميل لوحة التنفيذ التسويقية");
      setHealth(null); setActions(null); setLinks(null); setAudit(null); setComparison(null); setBudget(null);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const topActions = actions?.items?.slice(0, 5) ?? [];
  const topLinks = [...(links?.links ?? [])].sort((a, b) => b.performance.revenue - a.performance.revenue).slice(0, 5);
  const weakLinks = (links?.links ?? []).filter((row) => row.performance.donations === 0 || row.recommendation?.tone === "warning" || row.recommendation?.tone === "danger").slice(0, 5);
  const valueProblems = (audit?.rows ?? []).filter((row) => row.verdict === "UNDERCOUNTED_OLD_EVENT" || row.verdict === "NEEDS_RECHECK").slice(0, 5);
  const comparisonProblems = (comparison?.rows ?? []).filter((row) => row.verdict.tone === "danger" || row.verdict.tone === "warning").slice(0, 5);
  const budgetActions = (budget?.recommendations ?? []).filter((row) => row.decision === "SCALE" || row.decision === "PAUSE" || row.decision === "REDUCE" || row.decision === "FIX_TRACKING").slice(0, 5);

  return <div className="space-y-6 p-4 sm:p-6" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/dashboard/marketing-intelligence" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowRight className="h-4 w-4" /> العودة إلى مركز التسويق</Link><h1 className="text-2xl font-black text-slate-950">لوحة التنفيذ التسويقية</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">ملخص سريع لما يجب مراقبته اليوم: صحة النظام، التوصيات، فجوات المنصات، قيم التحويلات، والروابط التي تحتاج إصلاح.</p></div><Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button></div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {workflowShortcuts.map((item) => <Link key={item.href} href={item.href} className="rounded-2xl border bg-white p-4 transition hover:border-[#025EB8]/40 hover:shadow-sm">
        <div className="flex items-center gap-2 font-bold text-slate-900"><item.icon className="h-5 w-5 text-[#025EB8]" />{item.title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</div>
      </Link>)}
    </div>

    {loading ? <div className="flex min-h-[20rem] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#025EB8]" /></div> : !health || !actions || !links || !audit || !comparison || !budget ? <Card><CardContent className="p-8 text-center text-slate-500">لا توجد بيانات متاحة.</CardContent></Card> : <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" />صحة النظام</div><div className={`mt-2 text-3xl font-black ${scoreTone(health.scores.overall)}`}>{health.scores.overall}/100</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Zap className="h-4 w-4" />إجراءات عاجلة</div><div className="mt-2 text-3xl font-black text-rose-700">{actions.summary.high}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><TrendingUp className="h-4 w-4" />زود / أوقف</div><div className="mt-2 text-3xl font-black text-[#025EB8]">{budget.summary.scale}/{budget.summary.pause}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><DollarSign className="h-4 w-4" />فجوة المنصات</div><div className="mt-2 text-3xl font-black text-amber-700">{comparisonProblems.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />تحويلات ناقصة</div><div className="mt-2 text-3xl font-black text-amber-700">{health.donations.missingServerConversions}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Link2 className="h-4 w-4" />روابط جلبت تبرعات</div><div className="mt-2 text-3xl font-black text-emerald-700">{links.summary.linksWithDonations}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />أهم الإجراءات الآن</CardTitle><CardDescription>أولويات من مركز الإجراءات.</CardDescription></CardHeader><CardContent className="space-y-3">{topActions.length === 0 ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لا توجد إجراءات حالية.</div> : topActions.map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-xs ${priorityClass(item.priority)}`}>{priorityLabel(item.priority)}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.type}</span></div><div className="mt-2 font-bold text-slate-900">{item.title}</div><div className="mt-1 leading-6 text-slate-600">{item.action}</div><Link href={item.href} className="mt-2 inline-block text-sm font-medium text-[#025EB8] hover:underline">فتح القسم</Link></div>)}<Link href="/dashboard/marketing-intelligence/action-items" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح مركز الإجراءات</Link></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#025EB8]" />توصيات الميزانية</CardTitle><CardDescription>قرارات التشغيل والميزانية آخر 7 أيام.</CardDescription></CardHeader><CardContent className="space-y-3">{budgetActions.length === 0 ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لا توجد توصيات ميزانية قوية بعد.</div> : budgetActions.map((row) => <div key={row.id} className={`rounded-xl border p-3 text-sm ${decisionClass(row.decision)}`}><div className="flex items-center gap-2 font-bold">{decisionIcon(row.decision)}{decisionLabel(row.decision)} · {row.title}</div><div className="mt-1 leading-6">{row.action}</div><div className="mt-1 text-xs">Spend: {money(row.metrics.spend)} · Site ROAS: {(row.metrics.siteRoas || 0).toFixed(2)}x</div></div>)}<Link href="/dashboard/marketing-intelligence/budget-recommendations" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح توصيات الميزانية</Link></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-amber-600" />مقارنة الموقع والمنصات</CardTitle><CardDescription>فجوات الإنفاق والتحويلات والإيراد آخر 7 أيام.</CardDescription></CardHeader><CardContent className="space-y-3">{comparisonProblems.length === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-5 w-5" />لا توجد فجوات خطرة واضحة في بيانات المنصات.</div> : comparisonProblems.map((row) => <div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-bold">{row.campaignName || row.campaignId || row.platform}</div><div className="mt-1">Spend: {money(row.platformMetrics.spend)} · منصة: {row.platformMetrics.conversions} تحويل · موقع: {row.siteMetrics.donations} تبرع</div><div className="mt-1 text-xs">{row.verdict.label}: {row.verdict.action}</div></div>)}<Link href="/dashboard/marketing-intelligence/site-vs-platform" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح المقارنة</Link></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-amber-600" />تدقيق قيمة التحويلات</CardTitle><CardDescription>يفحص هل تم إرسال الإجمالي كاملًا شامل دعم الفريق والرسوم.</CardDescription></CardHeader><CardContent className="space-y-3">{valueProblems.length === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-5 w-5" />لا توجد فروقات قيمة واضحة في آخر 7 أيام.</div> : valueProblems.map((row) => <div key={row.donationId} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-bold">{row.donationId}</div><div className="mt-1">المشروع: {row.baseAmount} {row.currency} · دعم الفريق: {row.teamSupport} · الإجمالي: {row.expectedConversionValue}</div><div className="mt-1 text-xs">الحكم: {row.verdict}</div></div>)}<Link href="/dashboard/marketing-intelligence/conversion-value-audit" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح تدقيق القيمة</Link></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-600" />أفضل الروابط</CardTitle><CardDescription>حسب الإيراد المطابق آخر 7 أيام.</CardDescription></CardHeader><CardContent className="space-y-3">{topLinks.length === 0 ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لا توجد روابط بإيراد بعد.</div> : topLinks.map((row) => <div key={row.id} className="flex items-start justify-between gap-3 rounded-xl border p-3 text-sm"><div><div className="font-bold text-slate-900">{row.name}</div><div className="mt-1 text-xs text-slate-500">{row.platform || "—"} · تبرعات: {row.performance.donations}</div></div><div className="font-black text-emerald-700">{money(row.performance.revenue)}</div></div>)}<Link href="/dashboard/marketing-intelligence/campaign-links" className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-slate-50">فتح أداء الروابط</Link></CardContent></Card>
        <Card><CardHeader><CardTitle>روابط تحتاج إصلاح</CardTitle><CardDescription>روابط نشطة بدون تبرعات أو بتوصيات تحذيرية.</CardDescription></CardHeader><CardContent className="space-y-3">{weakLinks.length === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-5 w-5" />لا توجد روابط ضعيفة واضحة الآن.</div> : weakLinks.map((row) => <div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="font-bold">{row.name}</div><div className="mt-1 text-xs">{row.recommendation?.label || "يحتاج متابعة"}</div><div className="mt-2 leading-6">{row.recommendation?.action || "راجع بيانات الرابط والإسناد."}</div></div>)}</CardContent></Card>
      </div>
    </>}
  </div>;
}
