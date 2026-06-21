import type { DashboardPermissionKey } from "./permissions";

export const DASHBOARD_NAV_GROUPS: {
  group: string;
  items: { key: DashboardPermissionKey; title: string; href: string }[];
}[] = [
  {
    group: "الإدارة العامة",
    items: [
      { key: "revenue", title: "تحليل الإيرادات", href: "/dashboard" },
      { key: "monthly", title: "التبرعات الشهرية", href: "/dashboard/monthly" },
      { key: "bankTransfers", title: "التحويلات البنكية", href: "/dashboard/bank-transfers" },
      { key: "referrals", title: "روابط التتبع", href: "/dashboard/referrals" },
      { key: "logs", title: "سجل النشاط", href: "/dashboard/logs" },
    ],
  },
  {
    group: "إدارة المستخدمين",
    items: [
      { key: "donors", title: "متبرعين", href: "/dashboard/users/donors" },
      { key: "team", title: "فريق العمل", href: "/dashboard/users/team" },
      { key: "badges", title: "الشارات", href: "/dashboard/badges" },
      { key: "messages", title: "الرسائل", href: "/dashboard/messages" },
      { key: "templates", title: "القوالب", href: "/dashboard/templates" },
    ],
  },
  {
    group: "إدارة المحتوى",
    items: [
      { key: "campaigns", title: "المشاريع", href: "/dashboard/campaigns" },
      { key: "categories", title: "الحملات", href: "/dashboard/categories" },
      { key: "blog", title: "المدونة", href: "/dashboard/blog" },
    ],
  },
  {
    group: "المحتوى والتشغيل",
    items: [
      { key: "campaigns", title: "نظرة عامة", href: "/dashboard/operations" },
      { key: "campaigns", title: "التقويم والتنبيهات", href: "/dashboard/operations/calendar" },
      { key: "campaigns", title: "مهام الإنتاج", href: "/dashboard/operations/tasks" },
      { key: "campaigns", title: "لوحة الإنتاج", href: "/dashboard/operations/production" },
      { key: "campaigns", title: "الأرشيف", href: "/dashboard/operations/archive" },
      { key: "campaigns", title: "لوحة المحتوى", href: "/dashboard/operations/content" },
      { key: "campaigns", title: "خريطة النظام", href: "/dashboard/operations/system" },
    ],
  },
  {
    group: "التسويق والنمو",
    items: [
      { key: "ads", title: "نظرة عامة", href: "/dashboard/marketing" },
      { key: "platformConnections", title: "ربط المنصات", href: "/dashboard/marketing/connections" },
      { key: "ads", title: "مركز التتبع", href: "/dashboard/marketing/tracking-hub" },
      { key: "ads", title: "التحليلات والرؤى", href: "/dashboard/marketing/insights" },
      { key: "ads", title: "نتائج التسويق", href: "/dashboard/marketing/results" },
      { key: "ads", title: "حالة المنصات", href: "/dashboard/marketing-intelligence/platform-status" },
      { key: "ads", title: "قرارات التسويق", href: "/dashboard/marketing-intelligence/decisions" },
      { key: "ads", title: "Google Ads", href: "/dashboard/marketing/google-ads" },
      { key: "ads", title: "سجل المزامنة", href: "/dashboard/marketing/sync-log" },
      { key: "ads", title: "مساعد التسويق AI", href: "/dashboard/marketing/ai-assistant" },
      { key: "referrals", title: "منشئ الحملات والروابط", href: "/dashboard/link-generator" },
      { key: "pixels", title: "البكسلات والتتبع", href: "/dashboard/pixels" },
      { key: "ads", title: "أحداث التحويل", href: "/dashboard/conversion-events" },
      { key: "ads", title: "إدارة الإعلانات", href: "/dashboard/ads" },
    ],
  },
  {
    group: "إعدادات الهوية",
    items: [
      { key: "slides", title: "شرائح الهيرو", href: "/dashboard/slides" },
      { key: "ticker", title: "إعدادات التيكر", href: "/dashboard/ticker" },
    ],
  },
  {
    group: "اعدادات عامة",
    items: [
      { key: "generalSettings", title: "بوابات الدفع", href: "/dashboard/general/payment-gateways" },
      { key: "campaigns", title: "افتراضي دعم الفريق", href: "/dashboard/campaigns/team-support-defaults" },
    ],
  },
];

export const DASHBOARD_NAV_HREFS_ORDERED: string[] =
  DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

export function dashboardHrefToPermissionKey(
  href: string,
): DashboardPermissionKey | null {
  for (const g of DASHBOARD_NAV_GROUPS) {
    const found = g.items.find((i) => i.href === href);
    if (found) return found.key;
  }
  return null;
}

export const DASHBOARD_PERMISSION_ROWS = DASHBOARD_NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    key: item.key,
    group: g.group,
    title: item.title,
  })),
);

export const ACTION_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "reportsExport",
    title: "تصدير التقارير",
    description: "إظهار زر تصدير التقارير والسماح بتنزيل ملفات التقارير من لوحة التحكم.",
  },
  {
    key: "donationsEdit",
    title: "تعديل وإدارة التبرعات",
    description: "السماح بإدارة بيانات التبرعات من الجداول مع تحديث إجماليات المشاريع والحملات تلقائيًا.",
  },
];
