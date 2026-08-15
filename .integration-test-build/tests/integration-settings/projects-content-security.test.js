"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const page_access_1 = require("../../lib/dashboard/page-access");
const page_permission_1 = require("../../lib/dashboard/page-permission");
const admin_editor_data_core_1 = require("../../lib/blog/admin-editor-data-core");
const access_1 = require("../../lib/content-localization/access");
function sessionFor(role, permissions = []) {
    return {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: {
            id: `test-${role.toLowerCase()}`,
            name: "Test User",
            email: "test@example.org",
            role,
            dashboardPermissions: permissions,
        },
    };
}
class RedirectSignal extends Error {
    redirectTo;
    constructor(redirectTo) {
        super(`redirect:${redirectTo}`);
        this.redirectTo = redirectTo;
    }
}
function guardedLoaderFor(session) {
    const guard = (0, page_permission_1.createDashboardPagePermissionGuard)(async () => session, (redirectTo) => {
        throw new RedirectSignal(redirectTo);
    });
    return (0, page_permission_1.createDashboardPageDataLoader)(guard);
}
function blogEditorLoadersFor(session) {
    let getPostCalls = 0;
    let postCategoryReads = 0;
    let campaignReads = 0;
    const guardedLoad = guardedLoaderFor(session);
    const loaders = (0, admin_editor_data_core_1.createBlogAdminEditorDataLoaders)({
        loadDashboardPageData: (permission, loader) => guardedLoad(permission, async () => loader()),
        getPost: async (postId) => {
            getPostCalls += 1;
            return { id: postId };
        },
        loadCategories: async () => {
            postCategoryReads += 1;
            return [{ id: "category-1", name: "Category" }];
        },
        loadCampaigns: async () => {
            campaignReads += 1;
            return [{ id: "campaign-1", title: "Campaign" }];
        },
    });
    return {
        ...loaders,
        calls: () => ({ getPostCalls, postCategoryReads, campaignReads }),
    };
}
const protectedSections = ["campaigns", "categories", "blog"];
(0, node_test_1.default)("unauthenticated and donor users cannot enter protected content sections", () => {
    for (const permission of protectedSections) {
        strict_1.default.deepEqual((0, page_access_1.resolveDashboardPageAccess)(null, permission), {
            allowed: false,
            redirectTo: "/ar/auth/signin",
        });
        strict_1.default.equal((0, page_access_1.resolveDashboardPageAccess)(sessionFor("DONOR"), permission).allowed, false);
    }
});
(0, node_test_1.default)("staff without permissions cannot enter protected content sections", () => {
    for (const permission of protectedSections) {
        strict_1.default.equal((0, page_access_1.resolveDashboardPageAccess)(sessionFor("STAFF"), permission).allowed, false);
    }
});
for (const ownPermission of protectedSections) {
    (0, node_test_1.default)(`staff with ${ownPermission} can enter only that section`, () => {
        const session = sessionFor("STAFF", [ownPermission]);
        for (const requiredPermission of protectedSections) {
            strict_1.default.equal((0, page_access_1.resolveDashboardPageAccess)(session, requiredPermission).allowed, requiredPermission === ownPermission);
        }
    });
}
(0, node_test_1.default)("admin can enter campaigns categories and blog", () => {
    const session = sessionFor("ADMIN");
    for (const permission of protectedSections) {
        strict_1.default.equal((0, page_access_1.resolveDashboardPageAccess)(session, permission).allowed, true);
    }
});
(0, node_test_1.default)("denied users cannot start blog create or edit data reads", async () => {
    for (const deniedSession of [
        null,
        sessionFor("DONOR"),
        sessionFor("STAFF", ["campaigns"]),
    ]) {
        const createLoaders = blogEditorLoadersFor(deniedSession);
        await strict_1.default.rejects(createLoaders.loadBlogCreateEditorData(), RedirectSignal);
        strict_1.default.deepEqual(createLoaders.calls(), {
            getPostCalls: 0,
            postCategoryReads: 0,
            campaignReads: 0,
        });
        const editLoaders = blogEditorLoadersFor(deniedSession);
        await strict_1.default.rejects(editLoaders.loadBlogEditEditorData("post-1"), RedirectSignal);
        strict_1.default.deepEqual(editLoaders.calls(), {
            getPostCalls: 0,
            postCategoryReads: 0,
            campaignReads: 0,
        });
    }
});
(0, node_test_1.default)("admin and staff with blog permission can load blog editor data", async () => {
    for (const allowedSession of [
        sessionFor("ADMIN"),
        sessionFor("STAFF", ["blog"]),
    ]) {
        const createLoaders = blogEditorLoadersFor(allowedSession);
        const createData = await createLoaders.loadBlogCreateEditorData();
        strict_1.default.equal(createData.categories.length, 1);
        strict_1.default.equal(createData.campaigns.length, 1);
        strict_1.default.deepEqual(createLoaders.calls(), {
            getPostCalls: 0,
            postCategoryReads: 1,
            campaignReads: 1,
        });
        const editLoaders = blogEditorLoadersFor(allowedSession);
        const editData = await editLoaders.loadBlogEditEditorData("post-1");
        strict_1.default.equal(editData.post?.id, "post-1");
        strict_1.default.equal(editData.categories.length, 1);
        strict_1.default.equal(editData.campaigns.length, 1);
        strict_1.default.deepEqual(editLoaders.calls(), {
            getPostCalls: 1,
            postCategoryReads: 1,
            campaignReads: 1,
        });
    }
});
(0, node_test_1.default)("layouts remain defense in depth and pages use only editor data loaders", () => {
    for (const permission of protectedSections) {
        const layout = (0, node_fs_1.readFileSync)(`app/(dashboard)/dashboard/${permission}/layout.tsx`, "utf8");
        strict_1.default.match(layout, /requireDashboardPagePermission/);
        strict_1.default.match(layout, new RegExp(`requireDashboardPagePermission\\("${permission}"\\)`));
    }
    const createPage = (0, node_fs_1.readFileSync)("app/(dashboard)/dashboard/blog/create/page.tsx", "utf8");
    const editPage = (0, node_fs_1.readFileSync)("app/(dashboard)/dashboard/blog/create/[postId]/page.tsx", "utf8");
    strict_1.default.match(createPage, /loadBlogCreateEditorData\(\)/);
    strict_1.default.match(editPage, /loadBlogEditEditorData\(postId\)/);
    strict_1.default.doesNotMatch(createPage, /prisma\.|getPost|loadDashboardPageData/);
    strict_1.default.doesNotMatch(editPage, /prisma\.|getPost|loadDashboardPageData/);
});
(0, node_test_1.default)("server-only editor data module owns protected Prisma and getPost reads", () => {
    const source = (0, node_fs_1.readFileSync)("lib/blog/admin-editor-data.ts", "utf8");
    strict_1.default.match(source, /import "server-only"/);
    strict_1.default.match(source, /loadDashboardPageData/);
    strict_1.default.match(source, /getPost/);
    strict_1.default.match(source, /prisma\.postCategory\.findMany/);
    strict_1.default.match(source, /prisma\.campaign\.findMany/);
    strict_1.default.match(source, /loadBlogCreateEditorData/);
    strict_1.default.match(source, /loadBlogEditEditorData/);
});
(0, node_test_1.default)("targeted TypeScript scope includes editor data without legacy editor pages", () => {
    const tsconfig = (0, node_fs_1.readFileSync)("tsconfig.cms-security.json", "utf8");
    strict_1.default.match(tsconfig, /lib\/blog\/admin-editor-data\.ts/);
    strict_1.default.match(tsconfig, /lib\/blog\/admin-editor-data-core\.ts/);
    strict_1.default.doesNotMatch(tsconfig, /dashboard\/blog\/create\/page\.tsx/);
    strict_1.default.doesNotMatch(tsconfig, /dashboard\/blog\/create\/\[postId\]\/page\.tsx/);
});
(0, node_test_1.default)("localization sections map only to existing section permissions", () => {
    strict_1.default.equal((0, access_1.contentLocalizationPermissionForSection)("campaigns"), "campaigns");
    strict_1.default.equal((0, access_1.contentLocalizationPermissionForSection)("categories"), "categories");
    strict_1.default.equal((0, access_1.contentLocalizationPermissionForSection)("blog"), "blog");
    strict_1.default.equal((0, access_1.parseContentLocalizationSection)("content"), null);
    strict_1.default.equal((0, access_1.parseContentLocalizationSection)("unknown"), null);
});
(0, node_test_1.default)("localization audit and preview authorize by requested section", () => {
    for (const path of [
        "app/api/admin/content-localization/audit/route.ts",
        "app/api/admin/content-localization/preview/route.ts",
    ]) {
        const source = (0, node_fs_1.readFileSync)(path, "utf8");
        const handler = source.slice(source.indexOf("export async function GET"));
        const parseIndex = handler.indexOf("parseContentLocalizationSection");
        const directAuthIndex = handler.indexOf("contentLocalizationPermissionForSection(section)");
        const delegatedAuthIndex = handler.indexOf("authorize(section)");
        const authIndex = directAuthIndex >= 0 ? directAuthIndex : delegatedAuthIndex;
        const loadIndex = handler.indexOf("loadPreviewRows(") >= 0
            ? handler.indexOf("loadPreviewRows(")
            : handler.indexOf("loadItems(section)");
        strict_1.default.ok(parseIndex >= 0, `${path} must parse a known section`);
        strict_1.default.ok(authIndex > parseIndex, `${path} must authorize the parsed section`);
        strict_1.default.ok(loadIndex > authIndex, `${path} must authorize before loading section data`);
        strict_1.default.doesNotMatch(source, /requireAdminOrDashboardPermission\([^)]*["']content["']/s);
        strict_1.default.match(source, /contentLocalizationPermissionForSection\(section\)/);
    }
});
(0, node_test_1.default)("direct bulk Arabic mutation is disabled without OpenAI or database access", () => {
    const source = (0, node_fs_1.readFileSync)("app/api/admin/content-localization/arabic-bulk-proofread/route.ts", "utf8");
    strict_1.default.match(source, /Direct bulk proofreading is temporarily disabled/);
    strict_1.default.match(source, /status: 409/);
    strict_1.default.doesNotMatch(source, /api\.openai\.com|OPENAI_API_KEY|prisma\.|saveArabicItem|proofreadArabic/);
});
(0, node_test_1.default)("localization preview cannot apply or save database changes", () => {
    const api = (0, node_fs_1.readFileSync)("app/api/admin/content-localization/preview/route.ts", "utf8");
    const dialog = (0, node_fs_1.readFileSync)("app/(dashboard)/dashboard/_components/ContentLocalizationPreviewDialog.tsx", "utf8");
    const card = (0, node_fs_1.readFileSync)("app/(dashboard)/dashboard/_components/ContentLocalizationAuditCard.tsx", "utf8");
    strict_1.default.match(api, /body\?\.action !== "generate"/);
    strict_1.default.match(api, /status: 409/);
    strict_1.default.doesNotMatch(api, /\.update\(|\.upsert\(|\.create\(|\.delete\(/);
    strict_1.default.doesNotMatch(dialog, /saveRows|حفظ بعد التدقيق|rows:\s*changedRows/);
    strict_1.default.doesNotMatch(card, /arabic-bulk-proofread|تدقيق العربي بالكامل/);
});
(0, node_test_1.default)("read-only localization audit retains actionable item details", () => {
    const card = (0, node_fs_1.readFileSync)("app/(dashboard)/dashboard/_components/ContentLocalizationAuditCard.tsx", "utf8");
    strict_1.default.match(card, /العناصر التي تحتاج عملًا/);
    strict_1.default.match(card, /item\.label/);
    strict_1.default.match(card, /item\.typeLabel/);
    strict_1.default.match(card, /missingFields/);
    strict_1.default.match(card, /emptyFields/);
    strict_1.default.match(card, /identicalToArabicFields/);
    strict_1.default.match(card, /ملاحظات جودة العربية/);
    strict_1.default.match(card, /label="حقول فارغة" value=\{totals\.emptyFields\}/);
    strict_1.default.doesNotMatch(card, /حقول ناقصة أوفارغة/);
});
// "operations content permission boundary remains unchanged" read
// app/(dashboard)/dashboard/operations/layout.tsx, removed with التشغيل. There is no boundary
// left to assert on — the permission key is gone too.
(0, node_test_1.default)("targeted CMS security TypeScript check passes", () => {
    (0, node_child_process_1.execFileSync)(process.execPath, [
        "node_modules/typescript/bin/tsc",
        "-p",
        "tsconfig.cms-security.json",
    ], { stdio: "pipe" });
});
(0, node_test_1.default)("primary Prisma schema validates without modification", () => {
    (0, node_child_process_1.execFileSync)(process.execPath, [
        "node_modules/prisma/build/index.js",
        "validate",
        "--schema",
        "prisma/schema.prisma",
    ], { stdio: "pipe" });
});
