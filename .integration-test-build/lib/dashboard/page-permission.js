"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDashboardPagePermissionGuard = createDashboardPagePermissionGuard;
exports.createDashboardPageDataLoader = createDashboardPageDataLoader;
const page_access_1 = require("./page-access");
function createDashboardPagePermissionGuard(getSession, deny) {
    return async function requireDashboardPagePermission(permission) {
        const access = (0, page_access_1.resolveDashboardPageAccess)(await getSession(), permission);
        if (!access.allowed)
            return deny(access.redirectTo);
        return access.session;
    };
}
function createDashboardPageDataLoader(requirePermission) {
    return async function loadDashboardPageData(permission, loader) {
        const session = await requirePermission(permission);
        return loader(session);
    };
}
