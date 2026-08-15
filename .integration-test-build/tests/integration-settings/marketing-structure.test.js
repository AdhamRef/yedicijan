"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const page_access_1 = require("../../lib/dashboard/page-access");
const nav_config_1 = require("../../lib/dashboard/nav-config");
const permissions_1 = require("../../lib/dashboard/permissions");
function sessionFor(permissions) {
    return {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: {
            id: "marketing-test-user",
            name: "Marketing Test",
            email: "marketing@example.org",
            role: "STAFF",
            dashboardPermissions: permissions,
        },
    };
}
(0, node_test_1.default)("marketing navigation exposes exactly the two approved pages", () => {
    const marketing = nav_config_1.DASHBOARD_NAV_GROUPS.find((group) => group.group === "التسويق");
    strict_1.default.ok(marketing);
    strict_1.default.deepEqual(marketing.items.map((item) => item.href), [
        "/dashboard/marketing/attribution",
        "/dashboard/marketing/tracking",
    ]);
});
(0, node_test_1.default)("marketing routes preserve independent permission boundaries", () => {
    strict_1.default.equal((0, permissions_1.pathToDashboardPermission)("/dashboard/marketing/attribution"), "referrals");
    strict_1.default.equal((0, permissions_1.pathToDashboardPermission)("/dashboard/marketing/tracking"), "pixels");
    // Anything else under /dashboard/marketing still falls back to `ads`.
    strict_1.default.equal((0, permissions_1.pathToDashboardPermission)("/dashboard/marketing"), "ads");
});
(0, node_test_1.default)("generic server guard rejects unauthenticated and unauthorized users", () => {
    strict_1.default.deepEqual((0, page_access_1.resolveDashboardPageAccess)(null, "ads"), {
        allowed: false,
        redirectTo: "/ar/auth/signin",
    });
    const denied = (0, page_access_1.resolveDashboardPageAccess)(sessionFor(["referrals"]), "ads");
    strict_1.default.equal(denied.allowed, false);
    const allowed = (0, page_access_1.resolveDashboardPageAccess)(sessionFor(["ads"]), "ads");
    strict_1.default.equal(allowed.allowed, true);
});
(0, node_test_1.default)("server pages guard before protected reads", () => {
    // The marketing overview/performance/recommendations pages and the platform-connections
    // overview were removed; only pages that still exist can be asserted on here.
    const cases = [
        ["app/(dashboard)/dashboard/platform-connections/health/page.tsx", "integrationActorFromSession(session)"],
    ];
    for (const [path, protectedRead] of cases) {
        const source = (0, node_fs_1.readFileSync)(path, "utf8");
        const guard = source.indexOf("resolveDashboardPageAccess");
        const redirect = source.indexOf("redirect(access.redirectTo)");
        const read = source.indexOf(protectedRead);
        strict_1.default.ok(guard >= 0, `${path} must contain a server guard`);
        strict_1.default.ok(redirect > guard, `${path} must redirect denied users`);
        strict_1.default.ok(read > redirect, `${path} must not read protected data before redirect`);
        strict_1.default.doesNotMatch(source, /session!/);
    }
});
(0, node_test_1.default)("legacy marketing routes have explicit redirects", () => {
    const config = (0, node_fs_1.readFileSync)("next.config.ts", "utf8");
    for (const legacy of [
        "/dashboard/marketing/results",
        "/dashboard/marketing/insights",
        "/dashboard/marketing/data-sync",
        "/dashboard/marketing-intelligence/executive-overview",
        "/dashboard/marketing-intelligence/conversion-value-audit",
        "/dashboard/marketing-intelligence/platform-status",
        "/dashboard/marketing-intelligence/repair-center",
    ]) {
        strict_1.default.match(config, new RegExp(legacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
});
