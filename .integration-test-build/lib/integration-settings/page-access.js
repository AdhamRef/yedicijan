"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCommunicationConnectionsPageAccess = resolveCommunicationConnectionsPageAccess;
const permissions_1 = require("../dashboard/permissions");
const nav_config_1 = require("../dashboard/nav-config");
function resolveCommunicationConnectionsPageAccess(session) {
    const user = session?.user;
    if (!user) {
        return { allowed: false, redirectTo: "/ar/auth/signin" };
    }
    if (!(0, permissions_1.userHasDashboardPermission)(user, "platformConnections")) {
        const fallback = (0, permissions_1.getFirstAllowedDashboardHref)(user, nav_config_1.DASHBOARD_NAV_HREFS_ORDERED, nav_config_1.dashboardHrefToPermissionKey);
        return { allowed: false, redirectTo: fallback ?? "/" };
    }
    return { allowed: true, session: { ...session, user } };
}
