"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const nav_config_1 = require("../../lib/dashboard/nav-config");
const permissions_1 = require("../../lib/dashboard/permissions");
const read = (path) => (0, node_fs_1.readFileSync)(path, "utf8");
(0, node_test_1.default)("brand is absent from dashboard navigation and visible permissions", () => {
    strict_1.default.equal(nav_config_1.DASHBOARD_NAV_GROUPS.some((group) => group.group === "الهوية"), false);
    strict_1.default.equal(nav_config_1.DASHBOARD_NAV_HREFS_ORDERED.some((href) => href.startsWith("/dashboard/brand")), false);
    strict_1.default.equal(permissions_1.DASHBOARD_PERMISSION_KEYS.includes("brand"), false);
});
(0, node_test_1.default)("active navigation resolves one longest matching route", () => {
    // Sample routes only — this exercises the longest-prefix logic, not the routes themselves.
    // Switched off /dashboard/operations now that it is gone, so the fixture cannot be mistaken
    // for a claim that those pages still exist.
    const hrefs = [
        "/dashboard",
        "/dashboard/platform-connections",
        "/dashboard/platform-connections/communication",
    ];
    strict_1.default.equal((0, nav_config_1.resolveActiveDashboardHref)("/dashboard/platform-connections/communication/senders", hrefs), "/dashboard/platform-connections/communication");
    strict_1.default.equal((0, nav_config_1.resolveActiveDashboardHref)("/dashboard", hrefs), "/dashboard");
    strict_1.default.equal((0, nav_config_1.resolveActiveDashboardHref)("/dashboard-other", hrefs), null);
});
(0, node_test_1.default)("legacy brand asset and framework routes redirect directly", () => {
    const directRedirects = {
        "app/(dashboard)/dashboard/brand/assets/page.tsx": "/dashboard/archive/assets?source=legacy-brand",
        "app/(dashboard)/dashboard/brand/downloads/page.tsx": "/dashboard/archive/assets?source=legacy-brand",
        // Both used to land on the operations communication templates page. That page went with
        // التشغيل, so they now redirect to the surviving template editor.
        "app/(dashboard)/dashboard/brand/frameworks/page.tsx": "/dashboard/templates",
        "app/(dashboard)/dashboard/brand/message-templates/page.tsx": "/dashboard/templates",
    };
    for (const [path, destination] of Object.entries(directRedirects)) {
        const source = read(path);
        strict_1.default.ok(source.includes(`redirect("${destination}")`), `${path} must redirect directly to ${destination}`);
    }
});
(0, node_test_1.default)("legacy brand overview routes use a permission-aware fallback", () => {
    for (const path of [
        "app/(dashboard)/dashboard/brand/page.tsx",
        "app/(dashboard)/dashboard/brand/center/page.tsx",
        "app/(dashboard)/dashboard/brand/colors/page.tsx",
        "app/(dashboard)/dashboard/brand/typography/page.tsx",
        "app/(dashboard)/dashboard/brand/fonts/page.tsx",
        "app/(dashboard)/dashboard/brand/voice/page.tsx",
        "app/(dashboard)/dashboard/brand/tone/page.tsx",
        "app/(dashboard)/dashboard/brand/organizations/page.tsx",
    ]) {
        const source = read(path);
        strict_1.default.match(source, /resolveDashboardFallbackHref/);
        strict_1.default.match(source, /getServerSession/);
    }
});
(0, node_test_1.default)("brand management interfaces and exclusive APIs are removed", () => {
    for (const path of [
        "app/(dashboard)/dashboard/brand/_components/BrandCenterView.tsx",
        "app/(dashboard)/dashboard/brand/_components/BrandAssetCreatePanel.tsx",
        "app/(dashboard)/dashboard/brand/_components/BrandColorCreatePanel.tsx",
        "app/(dashboard)/dashboard/brand/_components/BrandFontCreatePanel.tsx",
        "app/(dashboard)/dashboard/brand/_components/BrandGuidelineCreatePanel.tsx",
        "app/(dashboard)/dashboard/brand/_components/BrandMessageFrameworkCreatePanel.tsx",
        "app/api/admin/brand/assets/route.ts",
        "app/api/admin/brand/colors/route.ts",
        "app/api/admin/brand/fonts/route.ts",
        "app/api/admin/brand/guidelines/route.ts",
        "app/api/admin/brand/frameworks/route.ts",
        "app/api/admin/brand/overview/route.ts",
        "app/api/admin/brand/ai/route.ts",
        "app/api/admin/archive/assets/[id]/add-to-brand-assets/route.ts",
    ]) {
        strict_1.default.equal((0, node_fs_1.existsSync)(path), false, `${path} must be removed`);
    }
});
(0, node_test_1.default)("legacy assets are exposed read-only in their new home", () => {
    const assets = read("app/(dashboard)/dashboard/archive/assets/page.tsx");
    strict_1.default.match(assets, /linkedLegacyAssets/);
    strict_1.default.match(assets, /Boolean\(asset\.fileUrl\)/);
    strict_1.default.match(assets, /LEGACY_BRAND/);
    // The frameworks half read the operations communication templates page, which no longer
    // exists — readFileSync on it throws rather than failing an assertion.
});
