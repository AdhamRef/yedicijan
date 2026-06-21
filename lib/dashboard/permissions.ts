import type { Session } from "next-auth";

type UserLike = {
  role?: string | null;
  dashboardPermissions?: string[] | null;
};

/** Stable keys aligned with dashboard nav / API authorization */
export const DASHBOARD_PERMISSION_KEYS = [
  "revenue",
  "monthly",
  "referrals",
  "bankTransfers",
  "donors",
  "team",
  "logs",
  "badges",
  "messages",
  "templates",
  "campaigns",
  "categories",
  "blog",
  "slides",
  "ticker",
  "pixels",
  "ads",
  "platformConnections",
  "generalSettings",
  // Action permissions — not tied to a sidebar route. Power-user only.
  "donationsEdit",
  "reportsExport",
] as const;

export type DashboardPermissionKey = (typeof DASHBOARD_PERMISSION_KEYS)[number];

export function isDashboardPermissionKey(
  k: string
): k is DashboardPermissionKey {
  return (DASHBOARD_PERMISSION_KEYS as readonly string[]).includes(k);
}

/** Legacy DB value: grants donors + team + logs */
const LEGACY_USERS_KEY = "users";

function rawDashboardPermissions(user: UserLike | undefined): string[] {
  if (!Array.isArray(user?.dashboardPermissions)) return [];
  return user!.dashboardPermissions!.filter((x): x is string => typeof x === "string");
}

function hasLegacyUsersPermission(user: UserLike | undefined): boolean {
  return rawDashboardPermissions(user).includes(LEGACY_USERS_KEY);
}

function legacyUsersGrants(key: DashboardPermissionKey): boolean {
  return key === "donors" || key === "team" || key === "logs";
}

export function isDashboardRoutePermissionKey(
  key: string
): key is DashboardPermissionKey {
  return isDashboardPermissionKey(key) && key !== "donationsEdit" && key !== "reportsExport";
}

export function hasAnyDashboardRoutePermission(user: UserLike | undefined): boolean {
  const raw = rawDashboardPermissions(user);
  if (raw.includes(LEGACY_USERS_KEY)) return true;
  return sanitizeDashboardPermissions(user?.dashboardPermissions).some(
    isDashboardRoutePermissionKey
  );
}

export function userHasDashboardPermission(
  user: UserLike | undefined,
  key: DashboardPermissionKey
): boolean {
  if (!user?.role) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "STAFF") {
    const perms = sanitizeDashboardPermissions(user.dashboardPermissions);
    if (perms.includes(key)) return true;
    if (hasLegacyUsersPermission(user) && legacyUsersGrants(key)) return true;
    return false;
  }
  return false;
}

/** True if staff may list/manage donors (promotions, donor table) */
export function userCanAccessDonorsManagement(user: UserLike | undefined): boolean {
  return userHasDashboardPermission(user, "donors");
}

/** True if staff may list team (admin/staff) */
export function userCanAccessTeamManagement(user: UserLike | undefined): boolean {
  return userHasDashboardPermission(user, "team");
}

/** True if staff may view dashboard activity log */
export function userCanAccessLogs(user: UserLike | undefined): boolean {
  return userHasDashboardPermission(user, "logs");
}

/** True if staff may view another user's full profile (donor or team lists) */
export function userCanViewUserProfilesInDashboard(
  user: UserLike | undefined
): boolean {
  return (
    userHasDashboardPermission(user, "donors") ||
    userHasDashboardPermission(user, "team") ||
    hasLegacyUsersPermission(user)
  );
}

/** True if staff may edit/delete individual donations (with stat reconciliation). */
export function userCanEditDonations(user: UserLike | undefined): boolean {
  return userHasDashboardPermission(user, "donationsEdit");
}

/** True if staff may export dashboard reports. */
export function userCanExportReports(user: UserLike | undefined): boolean {
  return userHasDashboardPermission(user, "reportsExport");
}

/** Longer prefixes first — first match wins */
const PATH_RULES: { prefix: string; key: DashboardPermissionKey }[] = [
  { prefix: "/dashboard/marketing/connections", key: "platformConnections" },
  { prefix: "/dashboard/marketing", key: "ads" },
  { prefix: "/dashboard/marketing-intelligence", key: "ads" },
  { prefix: "/dashboard/conversion-events", key: "ads" },
  { prefix: "/dashboard/ads", key: "ads" },
  { prefix: "/dashboard/monthly", key: "monthly" },
  { prefix: "/dashboard/link-generator", key: "referrals" },
  { prefix: "/dashboard/referrals", key: "referrals" },
  { prefix: "/dashboard/bank-transfers", key: "bankTransfers" },
  { prefix: "/dashboard/users/donors", key: "donors" },
  { prefix: "/dashboard/users/team", key: "team" },
  { prefix: "/dashboard/logs", key: "logs" },
  { prefix: "/dashboard/badges", key: "badges" },
  { prefix: "/dashboard/messages", key: "messages" },
  { prefix: "/dashboard/templates", key: "templates" },
  { prefix: "/dashboard/campaigns", key: "campaigns" },
  { prefix: "/dashboard/categories", key: "categories" },
  { prefix: "/dashboard/blog", key: "blog" },
  { prefix: "/dashboard/slides", key: "slides" },
  { prefix: "/dashboard/ticker", key: "ticker" },
  { prefix: "/dashboard/pixels", key: "pixels" },
  { prefix: "/dashboard/donations", key: "revenue" },
  { prefix: "/dashboard/brand", key: "revenue" },
  { prefix: "/dashboard/general", key: "generalSettings" },
  { prefix: "/dashboard", key: "revenue" },
];

export function pathToDashboardPermission(
  pathname: string
): DashboardPermissionKey | null {
  if (!pathname.startsWith("/dashboard")) return null;
  const sorted = [...PATH_RULES].sort(
    (a, b) => b.prefix.length - a.prefix.length
  );
  for (const r of sorted) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + "/")) {
      return r.key;
    }
  }
  return null;
}

/** Can open any dashboard route (sidebar may still be filtered) */
export function userCanEnterDashboard(user: UserLike | undefined): boolean {
  if (!user?.role) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "STAFF") {
    return hasAnyDashboardRoutePermission(user);
  }
  return false;
}

export function sessionHasDashboardPermission(
  session: Session | null,
  key: DashboardPermissionKey
): boolean {
  return userHasDashboardPermission(session?.user, key);
}

export function sanitizeDashboardPermissions(raw: unknown): DashboardPermissionKey[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<DashboardPermissionKey>();
  for (const x of raw) {
    if (typeof x === "string" && isDashboardPermissionKey(x)) out.add(x);
  }
  return [...out];
}

export function getFirstAllowedDashboardHref(
  user: UserLike | undefined,
  orderedHrefs: string[],
  hrefToKey: (href: string) => DashboardPermissionKey | null
): string | null {
  for (const href of orderedHrefs) {
    const key = hrefToKey(href);
    if (key && userHasDashboardPermission(user, key)) return href;
  }
  return null;
}
