import type { DashboardPermissionKey } from "./permissions";
import type { NavIconName } from "./nav-icons";
import { dt } from "./i18n";

export type DashboardNavItem = {
  key: DashboardPermissionKey;
  anyPermissions?: DashboardPermissionKey[];
  title: string;
  href: string;
  /** Rendered in the sidebar and the command palette. */
  icon: NavIconName;
  /** Extra search terms for the command palette  English slugs, synonyms, provider names. */
  keywords?: string[];
  /**
   * Opts this item into a live count pill in the sidebar.
   *
   * A slug, not a number: this module is plain serialisable data that server components import,
   * so it must not reach for a session, a database or a fetch. `DashboardLayoutClient` maps the
   * slug to a poller and hands the resolved numbers back down.
   */
  badge?: DashboardNavBadgeKey;
  /** Page is intentionally restricted to ADMIN even if staff hold related integration grants. */
  adminOnly?: boolean;
};

/** Counters the sidebar knows how to fetch. */
export type DashboardNavBadgeKey = "inboxUnread" | "transferReceiptsPending" | "subscriptionRequestsOpen";

export type DashboardNavGroup = { group: string; items: DashboardNavItem[] };

// Sidebar Information Architecture  practical, permission-gated sections in a fixed order.
// Integration setup and supporting donation tools live under Administration.
//
// Every item carries its OWN icon. Icons used to be looked up by `key` (the permission key)
// in DashboardLayoutClient, which meant the six "التواصل" items and the five operations items
// all shared one permission key and therefore rendered the identical MessageSquare glyph 
// the icon column conveyed nothing. Per-item icons fix that.
//
// Titles are also unique across the whole sidebar now. "نظرة عامة" and "السجلات المتقدمة"
// each appeared twice in different groups, and "الحملات" meant message campaigns here but
// fundraising projects two groups up; with a command palette searching these labels,
// ambiguous titles become unusable.
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    get group() { return dt("الرئيسية"); },
    items: [
      { key: "revenue", get title() { return dt("اللوحة الرئيسية"); }, href: "/dashboard", icon: "layoutDashboard", keywords: ["home","overview","الرئيسية"] },
      { key: "bankTransfers", get title() { return dt("التحويلات البنكية"); }, href: "/dashboard/bank-transfers", icon: "landmark", keywords: ["bank","transfers","حوالات"] },
      { key: "donors", get title() { return dt("المتبرعون"); }, href: "/dashboard/users/donors", icon: "users", keywords: ["donors","users","متبرعين"] },
    ],
  },
  {
    get group() { return dt("الحملات والمحتوى"); },
    items: [
      { key: "campaigns", get title() { return dt("المشاريع"); }, href: "/dashboard/campaigns", icon: "heart", keywords: ["projects","campaigns","مشاريع"] },
      { key: "categories", get title() { return dt("الحملات والدول"); }, href: "/dashboard/categories", icon: "globe", keywords: ["categories","countries","تصنيفات"] },
      { key: "blog", get title() { return dt("المدونة"); }, href: "/dashboard/blog", icon: "penLine", keywords: ["blog","posts","مقالات"] },
      { key: "slides", get title() { return dt("الشرائح"); }, href: "/dashboard/slides", icon: "images", keywords: ["slides","slider","hero"] },
      { key: "ticker", get title() { return dt("شريط التبرعات"); }, href: "/dashboard/ticker", icon: "ticket", keywords: ["ticker","marquee"] },
    ],
  },
  {
    get group() { return dt("التواصل"); },
    items: [
      { key: "messages", get title() { return dt("الحملات التسويقية"); }, href: "/dashboard/communication/campaigns", icon: "megaphone", keywords: ["campaigns","marketing","حملات","تسويق","broadcast","bulk"] },
      { key: "messages", get title() { return dt("البريد الإلكتروني"); }, href: "/dashboard/communication/email", icon: "mail", keywords: ["email","بريد","elastic"] },
      { key: "messages", get title() { return dt("واتساب"); }, href: "/dashboard/communication/whatsapp", icon: "messageCircle", keywords: ["whatsapp","واتساب","meta"] },
      { key: "messages", get title() { return dt("الرسائل النصية"); }, href: "/dashboard/communication/sms", icon: "messageSquare", keywords: ["sms","نصية","netgsm","brevo"] },
      { key: "templates", get title() { return dt("القوالب والمحفّزات"); }, href: "/dashboard/templates", icon: "mail", keywords: ["email","whatsapp","templates","triggers","قوالب","محفزات"] },
      { key: "badges", get title() { return dt("الشارات"); }, href: "/dashboard/badges", icon: "award", keywords: ["badges","donor lists"] },
      { key: "messages", get title() { return dt("الرسائل الواردة"); }, href: "/dashboard/inbox", icon: "inbox", keywords: ["inbox","inbound","contact","واردة","زوار","تواصل"] },
    ],
  },
  {
    get group() { return dt("التسويق"); },
    items: [
      { key: "referrals", get title() { return dt("الروابط والإسناد"); }, href: "/dashboard/marketing/attribution", icon: "link", keywords: ["attribution","referrals","links","utm"] },
      { key: "pixels", get title() { return dt("التتبع والتحويلات"); }, href: "/dashboard/marketing/tracking", icon: "target", keywords: ["tracking","pixels","conversions","capi"] },
    ],
  },
  {
    get group() { return dt("ربط المنصات والإرسال"); },
    items: [
      { key: "platformConnections", get title() { return dt("بكسلات التتبع"); }, href: "/dashboard/platform-connections/tracking", icon: "radar", keywords: ["pixels","meta","tiktok","snap"] },
      { key: "platformConnections", get title() { return dt("مزودو التواصل والإرسال"); }, href: "/dashboard/platform-connections/communication", icon: "server", keywords: ["providers","whatsapp","email"] },
      { key: "platformConnections", get title() { return dt("فحص الاتصال"); }, href: "/dashboard/platform-connections/health", icon: "heartPulse", keywords: ["health","status","diagnostics"] },
      { key: "platformConnections", get title() { return dt("تيليجرام"); }, href: "/dashboard/telegram", icon: "send", keywords: ["telegram","bot","notifications"] },
    ],
  },
  {
    get group() { return dt("الإدارة"); },
    items: [
      { key: "siteContent", get title() { return dt("معرض لقطات من الميدان"); }, href: "/dashboard/gallery", icon: "images", adminOnly: true, keywords: ["gallery","photos","images","field","معرض","صور","لقطات"] },
      { key: "team", get title() { return dt("الفريق"); }, href: "/dashboard/users/team", icon: "userCog", keywords: ["team","staff","permissions","صلاحيات"] },
      { key: "generalSettings", get title() { return dt("الإعدادات"); }, href: "/dashboard/general/payment-gateways", icon: "settings", keywords: ["settings","payment","gateways"] },
      { key: "generalSettings", get title() { return dt("تجديدات الخدمات"); }, href: "/dashboard/renewals", icon: "repeat", adminOnly: true, keywords: ["renewal","subscription","billing","expiry","تجديد","اشتراك"] },
      { key: "logs", get title() { return dt("سجلات النظام"); }, href: "/dashboard/logs", icon: "scrollText", keywords: ["logs","audit","system"] },
    ],
  },
];

/**
 * Pages that exist and are permission-guarded but are deliberately not in the
 * sidebar. They are only used as a last-resort landing page, so a staffer
 * whose sole grant is one of these keys lands somewhere real instead of being
 * bounced out of the dashboard. `ads` → the legacy ads analytics page.
 */
export const DASHBOARD_UNLISTED_LANDINGS: { href: string; key: DashboardPermissionKey }[] = [
  { href: "/dashboard/ads", key: "ads" },
];

export const DASHBOARD_NAV_HREFS_ORDERED: string[] = [
  ...DASHBOARD_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)),
  ...DASHBOARD_UNLISTED_LANDINGS.map((l) => l.href),
];

export function dashboardHrefToPermissionKey(
  href: string,
): DashboardPermissionKey | null {
  for (const g of DASHBOARD_NAV_GROUPS) {
    const found = g.items.find((i) => i.href === href);
    if (found) return found.key;
  }
  return DASHBOARD_UNLISTED_LANDINGS.find((l) => l.href === href)?.key ?? null;
}

export function resolveActiveDashboardHref(pathname: string, hrefs: readonly string[]): string | null {
  return [...hrefs]
    .filter((href) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}

export const DASHBOARD_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  group: string;
  title: string;
}[] = [
  { key: "revenue", get group() { return dt("الرئيسية"); }, get title() { return dt("اللوحة الرئيسية"); } },
  // One grant for the whole finance desk: the statement importer and the donor-receipt queue.
  { key: "bankTransfers", get group() { return dt("الرئيسية"); }, get title() { return dt("التحويلات البنكية وإيصالات التحويل"); } },
  // Separate from siteContent: these rows are where donors send money (IBAN/SWIFT).
  { key: "bankAccounts", get group() { return dt("الرئيسية"); }, get title() { return dt("الحسابات البنكية (IBAN)  صلاحية مالية حساسة"); } },
  { key: "donors", get group() { return dt("الرئيسية"); }, get title() { return dt("المتبرعون"); } },
  { key: "campaigns", get group() { return dt("محتوى الموقع"); }, get title() { return dt("المشاريع"); } },
  { key: "categories", get group() { return dt("محتوى الموقع"); }, get title() { return dt("التصنيفات"); } },
  { key: "blog", get group() { return dt("محتوى الموقع"); }, get title() { return dt("المدونة"); } },
  // P3-2: these five keys were valid in DASHBOARD_PERMISSION_KEYS and enforced by the API
  // guards, but appeared in NO grant UI  so they could never actually be granted, and a user
  // holding one saw an empty sidebar and got bounced out of the dashboard. Now that their
  // pages are linked in the nav above, they must also be grantable.
  { key: "slides", get group() { return dt("محتوى الموقع"); }, get title() { return dt("الشرائح"); } },
  { key: "ticker", get group() { return dt("محتوى الموقع"); }, get title() { return dt("شريط التبرعات"); } },
  // One key for the whole "محتوى الموقع" group. Was enforced by every /api/* content route and
  // shown in the nav, but absent here  the same P3-2 shape: valid, checked, and ungrantable.
  { key: "siteContent", get group() { return dt("محتوى الموقع"); }, get title() { return dt("محتوى الموقع (قصص، فيديو، تقارير، أسئلة…)"); } },
  // Group was "التشغيل / التواصل"; التشغيل no longer exists, so these two are plain التواصل.
  { key: "templates", get group() { return dt("التواصل"); }, get title() { return dt("القوالب والمحفّزات"); } },
  // The outbound send log page is gone; `messages` now grants the inbox and the per-channel
  // communication pages, which all check the same key.
  { key: "badges", get group() { return dt("التواصل"); }, get title() { return dt("تصنيفات المتبرعين"); } },
  { key: "messages", get group() { return dt("التواصل"); }, get title() { return dt("الرسائل الواردة والتواصل"); } },
  // No sidebar item carries `ads` any more  the marketing overview, performance and
  // recommendations pages were removed. The key stays grantable because the route guard still
  // maps the /dashboard/marketing prefix to it, so revoking it here would silently strand any
  // staffer whose only grant is `ads`.
  { key: "ads", get group() { return dt("التسويق"); }, get title() { return dt("(قديم) صفحة تحليل الإعلانات /dashboard/ads  ليست في القائمة؛ للإسناد والتتبع استخدم الصلاحيتين التاليتين"); } },
  { key: "referrals", get group() { return dt("التسويق"); }, get title() { return dt("إدارة الروابط والإسناد"); } },
  { key: "pixels", get group() { return dt("التسويق"); }, get title() { return dt("عرض التتبع والتحويلات"); } },
  { key: "aiConcierge", get group() { return dt("مساعد العطاء (AI)"); }, get title() { return dt("مساعد العطاء: الأداء والمحادثات والاستنتاجات والإعدادات"); } },
  { key: "platformConnections", get group() { return dt("ربط المنصات والإرسال"); }, get title() { return dt("ربط المنصات والإرسال"); } },
  // Same P3-2 shape as the five above: `/dashboard/archive` is guarded by this key in
  // PATH_RULES and every archive API asks for it, but it was in no grant screen  so the archive
  // was admin-only in practice, and granting the المستندات action below could never take effect
  // because its holder could not reach the archive at all.
  { key: "archive", get group() { return dt("محتوى الموقع"); }, get title() { return dt("إدارة ملفات المحتوى المرفقة"); } },
  { key: "team", get group() { return dt("الإدارة"); }, get title() { return dt("الفريق"); } },
  // Today this key controls only the payment-gateway page (main gateway, PayFor):
  // where every new donation's money goes. Labelled so it is granted knowingly.
  { key: "generalSettings", get group() { return dt("الإدارة"); }, get title() { return dt("إعدادات بوابات الدفع  صلاحية مالية حساسة"); } },
  { key: "logs", get group() { return dt("الإدارة"); }, get title() { return dt("السجلات المتقدمة"); } },
];

export const ACTION_PERMISSION_ROWS: {
  key: DashboardPermissionKey;
  title: string;
  description: string;
}[] = [
  {
    key: "reportsExport",
    get title() { return dt("تصدير التقارير"); },
    get description() { return dt("إظهار زر تصدير التقارير والسماح بتنزيل ملفات التقارير من لوحة التحكم."); },
  },
  {
    key: "donationsEdit",
    get title() { return dt("تعديل وإدارة التبرعات"); },
    get description() { return dt("السماح بإدارة بيانات التبرعات من الجداول مع تحديث إجماليات المشاريع والحملات تلقائيًا."); },
  },
  // The three integration levels are enforced by lib/integration-settings/{auth,api-contracts}.ts
  // but could not be granted from here, so in practice only an admin could test or change a
  // provider. Each level includes the ones below it (see integrationPermissionRank).
  {
    key: "platformConnectionsTest",
    get title() { return dt("ربط المنصات: اختبار الاتصال"); },
    get description() { return dt("عرض المنصات وتشغيل اختبار الاتصال بمزوّد (بريد، واتساب، SMS…). لا يسمح بتغيير الإعدادات."); },
  },
  {
    key: "platformConnectionsManage",
    get title() { return dt("ربط المنصات: حفظ وتفعيل الإعدادات"); },
    get description() { return dt("حفظ مفاتيح وإعدادات مزوّد وتفعيل الإعداد الجديد أو تجاهله. يشمل الاختبار. صلاحية حساسة."); },
  },
  {
    key: "platformConnectionsAdmin",
    get title() { return dt("ربط المنصات: حذف وإدارة كاملة"); },
    get description() { return dt("حذف إعدادات مزوّد وعرض حالته الكاملة. يشمل الحفظ والاختبار. صلاحية حساسة جدًا."); },
  },
  // Enforced by app/api/admin/archive/_auth.ts on every DOCUMENTS listing, but it appeared in no
  // grant screen and  unlike archiveUpload/Delete/Analyze  is not derived from "archive", so
  // nobody but an admin could hold it: a member of staff given the archive returned an
  // unexplained 403 the moment they opened المستندات. It stays a separate grant rather than
  // riding on "archive" because the two hold different things: marketing files on one side,
  // contracts and licences on the other.
  {
    key: "archiveDocuments",
    get title() { return dt("ملفات المحتوى: المستندات الحساسة"); },
    get description() { return dt("السماح بإدارة المستندات الرسمية الحساسة التي تستخدمها نماذج المحتوى، مثل العقود والتراخيص."); },
  },
];
