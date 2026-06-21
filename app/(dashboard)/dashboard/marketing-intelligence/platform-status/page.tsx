"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, Settings2, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlatformHealth = {
  platform: string;
  label: string;
  ready: boolean;
  missing: string[];
};

type HealthResponse = {
  platforms: PlatformHealth[];
  sync?: { meta?: { status?: string; rowsFetched?: number; error?: string | null; startedAt?: string; finishedAt?: string | null } | null };
};

type PlatformCapability = {
  platform: string;
  displayName: string;
  status: "live" | "partial" | "planned";
  browser: string;
  server: string;
  reporting: string;
  nextStep: string;
};

const CAPABILITIES: PlatformCapability[] = [
  {
    platform: "META",
    displayName: "Meta",
    status: "live",
    browser: "Pixel Donate and funnel events",
    server: "Conversions API for final donations",
    reporting: "Ads reporting sync is active",
    nextStep: "Improve breakdowns and attribution-window comparison",
  },
  {
    platform: "GA4",
    displayName: "GA4",
    status: "partial",
    browser: "GA4 browser events",
    server: "Measurement Protocol purchase events",
    reporting: "Data API reporting sync is planned",
    nextStep: "Connect GA4 Data API for source, medium, campaign, and transaction reports",
  },
  {
    platform: "GOOGLE_ADS",
    displayName: "Google Ads",
    status: "partial",
    browser: "Browser conversion tag when conversion ID and label exist",
    server: "Offline/enhanced conversion upload is planned",
    reporting: "GAQL campaign reporting is planned",
    nextStep: "Add GAQL sync for campaign, ad group, and ad performance",
  },
  {
    platform: "TIKTOK",
    displayName: "TikTok",
    status: "partial",
    browser: "TikTok browser pixel",
    server: "Events API final conversion is planned",
    reporting: "Reports API sync is planned",
    nextStep: "Add TikTok Events API and reporting client",
  },
  {
    platform: "X",
    displayName: "X",
    status: "partial",
    browser: "X browser pixel",
    server: "Server conversion support is planned",
    reporting: "Ads reporting sync is planned",
    nextStep: "Add supported reporting/server features after account permissions are confirmed",
  },
];

function statusLabel(status: PlatformCapability["status"]) {
  if (status === "live") return "مكتمل تشغيليًا";
  if (status === "partial") return "جزئي";
  return "مخطط لاحقًا";
}

function statusClass(status: PlatformCapability["status"]) {
  if (status === "live") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusIcon(status: PlatformCapability["status"]) {
  if (status === "live") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "partial") return <Wrench className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

export default function PlatformStatusPage() {
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/marketing-intelligence/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setHealth(data as HealthResponse); })
      .catch(() => { if (!cancelled) setHealth(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const platformHealth = new Map((health?.platforms ?? []).map((platform) => [platform.platform, platform]));

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#025EB8]" /></div>;
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Settings2 className="h-3.5 w-3.5" />
            حالة المنصات
          </div>
          <h1 className="mt-3 text-2xl font-black text-slate-900">جاهزية منصات التسويق والتتبع</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            هذه الصفحة توضّح ما يعمل حاليًا وما هو جزئي وما هو مخطط لاحقًا، حتى لا تختلط الإعدادات الموجودة مع التكاملات المكتملة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/dashboard/marketing-intelligence">مركز التسويق</Link>
          <Link className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/dashboard/marketing/connections">ربط المنصات</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CAPABILITIES.map((capability) => {
          const h = platformHealth.get(capability.platform);
          return (
            <Card key={capability.platform}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{capability.displayName}</CardTitle>
                    <CardDescription>{h?.label ?? capability.platform}</CardDescription>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${statusClass(capability.status)}`}>
                    {statusIcon(capability.status)}
                    {statusLabel(capability.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Browser</div><div className="mt-1 font-medium text-slate-800">{capability.browser}</div></div>
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Server</div><div className="mt-1 font-medium text-slate-800">{capability.server}</div></div>
                  <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Reporting</div><div className="mt-1 font-medium text-slate-800">{capability.reporting}</div></div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-semibold text-slate-900">الإعدادات الحالية</div>
                  {h?.ready ? (
                    <div className="mt-1 text-emerald-700">الإعدادات المطلوبة لهذه المرحلة موجودة.</div>
                  ) : (
                    <div className="mt-1 text-amber-700">ناقص: {h?.missing?.join("، ") || "غير معروف"}</div>
                  )}
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-blue-800"><b>الخطوة القادمة:</b> {capability.nextStep}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
