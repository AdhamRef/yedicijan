"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDashboardFallbackHref = resolveDashboardFallbackHref;
exports.resolveDashboardPageAccess = resolveDashboardPageAccess;
const permissions_1 = require("./permissions");
const nav_config_1 = require("./nav-config");
function resolveDashboardFallbackHref(session) {
    const user = session?.user;
    if (!user)
        return "/ar/auth/signin";
    return (0, permissions_1.getFirstAllowedDashboardHref)(user, nav_config_1.DASHBOARD_NAV_HREFS_ORDERED, nav_config_1.dashboardHrefToPermissionKey) ?? "/";
}
function resolveDashboardPageAccess(session, requiredPermission) {
    const user = session?.user;
    if (!user) {
        return { allowed: false, redirectTo: "/ar/auth/signin" };
    }
    if (!(0, permissions_1.userHasDashboardPermission)(user, requiredPermission)) {
        return { allowed: false, redirectTo: resolveDashboardFallbackHref(session) };
    }
    return { allowed: true, session: { ...session, user } };
}
