"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DASHBOARD_PERMISSION_KEYS = void 0;
exports.isDashboardPermissionKey = isDashboardPermissionKey;
exports.isDashboardRoutePermissionKey = isDashboardRoutePermissionKey;
exports.hasAnyDashboardRoutePermission = hasAnyDashboardRoutePermission;
exports.userHasDashboardPermission = userHasDashboardPermission;
exports.userCanAccessDonorsManagement = userCanAccessDonorsManagement;
exports.userCanAccessTeamManagement = userCanAccessTeamManagement;
exports.userCanAccessLogs = userCanAccessLogs;
exports.userCanViewUserProfilesInDashboard = userCanViewUserProfilesInDashboard;
exports.userCanEditDonations = userCanEditDonations;
exports.userCanExportReports = userCanExportReports;
exports.pathToDashboardPermission = pathToDashboardPermission;
exports.userCanEnterDashboard = userCanEnterDashboard;
exports.sessionHasDashboardPermission = sessionHasDashboardPermission;
exports.sanitizeDashboardPermissions = sanitizeDashboardPermissions;
exports.getFirstAllowedDashboardHref = getFirstAllowedDashboardHref;
exports.DASHBOARD_PERMISSION_KEYS = [
    "revenue", "monthly", "referrals", "bankTransfers", "donors", "team", "logs",
    "badges", "messages", "templates", "campaigns", "categories", "blog", "slides",
    // "operations" was removed with the التشغيل section. Any value still stored on a user row is
    // simply inert — it maps to no page and grants nothing.
    "ticker", "pixels", "ads", "platformConnections", "archive",
    "generalSettings", "platformConnectionsTest", "platformConnectionsManage",
    "platformConnectionsAdmin", "archiveUpload", "archiveDelete", "archiveAnalyze",
    "archiveDocuments", "donationsEdit", "reportsExport",
];
const ACTION_PERMISSION_KEYS = [
    "platformConnectionsTest", "platformConnectionsManage", "platformConnectionsAdmin",
    "archiveUpload", "archiveDelete", "archiveAnalyze", "archiveDocuments",
    "donationsEdit", "reportsExport",
];
const LEGACY_USERS_KEY = "users";
function isDashboardPermissionKey(k) {
    return exports.DASHBOARD_PERMISSION_KEYS.includes(k);
}
function rawDashboardPermissions(user) {
    return Array.isArray(user?.dashboardPermissions)
        ? user.dashboardPermissions.filter((x) => typeof x === "string")
        : [];
}
function hasLegacyUsersPermission(user) {
    return rawDashboardPermissions(user).includes(LEGACY_USERS_KEY);
}
function legacyUsersGrants(key) {
    return key === "donors" || key === "team" || key === "logs";
}
function integrationPermissionRank(key) {
    return key === "platformConnections" ? 1
        : key === "platformConnectionsTest" ? 2
            : key === "platformConnectionsManage" ? 3
                : key === "platformConnectionsAdmin" ? 4 : 0;
}
function hasIntegrationPermission(perms, key) {
    const required = integrationPermissionRank(key);
    return required > 0 && perms.some((permission) => integrationPermissionRank(permission) >= required);
}
function isDashboardRoutePermissionKey(key) {
    return isDashboardPermissionKey(key) && !ACTION_PERMISSION_KEYS.includes(key);
}
function hasAnyDashboardRoutePermission(user) {
    const raw = rawDashboardPermissions(user);
    if (raw.includes(LEGACY_USERS_KEY))
        return true;
    const perms = sanitizeDashboardPermissions(user?.dashboardPermissions);
    return perms.some(isDashboardRoutePermissionKey) || hasIntegrationPermission(perms, "platformConnections");
}
function userHasDashboardPermission(user, key) {
    if (!user?.role)
        return false;
    if (user.role === "ADMIN")
        return true;
    if (user.role !== "STAFF")
        return false;
    const perms = sanitizeDashboardPermissions(user.dashboardPermissions);
    if (perms.includes(key) || hasIntegrationPermission(perms, key))
        return true;
    if ((key === "archiveUpload" || key === "archiveDelete" || key === "archiveAnalyze") && perms.includes("archive"))
        return true;
    return hasLegacyUsersPermission(user) && legacyUsersGrants(key);
}
function userCanAccessDonorsManagement(user) { return userHasDashboardPermission(user, "donors"); }
function userCanAccessTeamManagement(user) { return userHasDashboardPermission(user, "team"); }
function userCanAccessLogs(user) { return userHasDashboardPermission(user, "logs"); }
function userCanViewUserProfilesInDashboard(user) {
    return userHasDashboardPermission(user, "donors") || userHasDashboardPermission(user, "team") || hasLegacyUsersPermission(user);
}
function userCanEditDonations(user) { return userHasDashboardPermission(user, "donationsEdit"); }
function userCanExportReports(user) { return userHasDashboardPermission(user, "reportsExport"); }
const PATH_RULES = [
    { prefix: "/dashboard/platform-connections", key: "platformConnections" },
    { prefix: "/dashboard/marketing/attribution", key: "referrals" },
    { prefix: "/dashboard/marketing/tracking", key: "pixels" },
    { prefix: "/dashboard/marketing/connections", key: "platformConnections" },
    { prefix: "/dashboard/marketing", key: "ads" },
    { prefix: "/dashboard/marketing-intelligence", key: "ads" },
    { prefix: "/dashboard/conversion-events", key: "pixels" },
    { prefix: "/dashboard/ads", key: "ads" },
    { prefix: "/dashboard/archive", key: "archive" },
    { prefix: "/dashboard/monthly", key: "monthly" },
    { prefix: "/dashboard/link-generator", key: "referrals" },
    { prefix: "/dashboard/referrals", key: "referrals" },
    { prefix: "/dashboard/bank-transfers", key: "bankTransfers" },
    { prefix: "/dashboard/users/donors", key: "donors" },
    { prefix: "/dashboard/users/team", key: "team" },
    { prefix: "/dashboard/logs", key: "logs" },
    { prefix: "/dashboard/badges", key: "badges" },
    { prefix: "/dashboard/communication", key: "messages" },
    // Without its own rule /dashboard/inbox fell through to the "/dashboard → revenue" catch-all,
    // so the route guard demanded `revenue` while the sidebar entry and the API both check
    // `messages` — a staffer granted the inbox was bounced straight back out of it.
    { prefix: "/dashboard/inbox", key: "messages" },
    { prefix: "/dashboard/templates", key: "templates" },
    { prefix: "/dashboard/campaigns", key: "campaigns" },
    { prefix: "/dashboard/categories", key: "categories" },
    { prefix: "/dashboard/blog", key: "blog" },
    { prefix: "/dashboard/slides", key: "slides" },
    { prefix: "/dashboard/ticker", key: "ticker" },
    { prefix: "/dashboard/pixels", key: "pixels" },
    { prefix: "/dashboard/donations", key: "revenue" },
    { prefix: "/dashboard/general", key: "generalSettings" },
    { prefix: "/dashboard", key: "revenue" },
];
function pathToDashboardPermission(pathname) {
    if (!pathname.startsWith("/dashboard"))
        return null;
    for (const rule of [...PATH_RULES].sort((a, b) => b.prefix.length - a.prefix.length)) {
        if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/"))
            return rule.key;
    }
    return null;
}
function userCanEnterDashboard(user) {
    return user?.role === "ADMIN" || (user?.role === "STAFF" && hasAnyDashboardRoutePermission(user));
}
function sessionHasDashboardPermission(session, key) {
    return userHasDashboardPermission(session?.user, key);
}
function sanitizeDashboardPermissions(raw) {
    if (!Array.isArray(raw))
        return [];
    return [...new Set(raw.filter((x) => typeof x === "string" && isDashboardPermissionKey(x)))];
}
function getFirstAllowedDashboardHref(user, orderedHrefs, hrefToKey) {
    for (const href of orderedHrefs) {
        const key = hrefToKey(href);
        if (key && userHasDashboardPermission(user, key))
            return href;
    }
    return null;
}
