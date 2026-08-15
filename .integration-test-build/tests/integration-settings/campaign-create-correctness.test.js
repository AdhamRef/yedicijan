"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const admin_create_core_1 = require("../../lib/campaign/admin-create-core");
const permissions_1 = require("../../lib/dashboard/permissions");
const CATEGORY_ID = "507f1f77bcf86cd799439011";
const OTHER_CATEGORY_ID = "507f1f77bcf86cd799439012";
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
function validBody(overrides = {}) {
    return {
        title: "مشروع مياه",
        description: JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "وصف عربي" }] }],
        }),
        targetAmount: 1000,
        currentAmount: 0,
        images: ["https://example.org/image.jpg"],
        videoUrl: "",
        categoryIds: [CATEGORY_ID],
        isActive: true,
        goalType: "FIXED",
        fundraisingMode: "AMOUNT",
        translations: {},
        ...overrides,
    };
}
const emptyExtras = {
    categoryPriorities: {},
    suggestedDonations: null,
    suggestedTeamSupport: null,
    suggestedShareCounts: null,
    shareLabels: null,
};
function memoryDependencies(options = {}) {
    const state = { campaigns: [], translations: [] };
    const existingSlugs = new Set(options.existingSlugs ?? []);
    const categories = options.categories ?? [{ id: CATEGORY_ID, isActive: true }];
    return {
        state,
        dependencies: {
            transaction: async (operation) => {
                const draft = {
                    campaigns: [...state.campaigns],
                    translations: [...state.translations],
                };
                const tx = {
                    findCategories: async (ids) => categories.filter((category) => ids.includes(category.id)),
                    generateCampaignSlug: async (base) => {
                        const normalized = base.trim().replace(/\s+/g, "-");
                        let candidate = normalized;
                        let suffix = 2;
                        while (existingSlugs.has(candidate))
                            candidate = `${normalized}-${suffix++}`;
                        existingSlugs.add(candidate);
                        return candidate;
                    },
                    generateTranslationSlug: async (locale, base) => `${base.trim().replace(/\s+/g, "-")}-${locale}`,
                    createCampaign: async (data) => {
                        draft.campaigns.push(data);
                        return { id: `campaign-${draft.campaigns.length}`, title: data.title };
                    },
                    createTranslation: async (data) => {
                        if (options.failLocale === data.locale)
                            throw new Error(`translation ${data.locale} failed`);
                        draft.translations.push(data);
                    },
                    getCreatedCampaign: async (campaignId) => ({
                        id: campaignId,
                        campaign: draft.campaigns.at(-1),
                        translations: [...draft.translations],
                    }),
                };
                const result = await operation(tx);
                state.campaigns = draft.campaigns;
                state.translations = draft.translations;
                return result;
            },
        },
    };
}
(0, node_test_1.default)("creates an Arabic-only campaign", async () => {
    const parsed = (0, admin_create_core_1.parseCampaignCreatePayload)(validBody(), emptyExtras);
    const memory = memoryDependencies();
    await (0, admin_create_core_1.createCampaignCreator)(memory.dependencies)(parsed);
    strict_1.default.equal(memory.state.campaigns.length, 1);
    strict_1.default.equal(memory.state.campaigns[0].title, "مشروع مياه");
    strict_1.default.equal(memory.state.translations.length, 0);
});
(0, node_test_1.default)("creates every supported translation supplied by the form", async () => {
    const translations = Object.fromEntries(["en", "fr", "tr", "id", "pt", "es", "de"].map((locale) => [
        locale,
        {
            title: `Title ${locale}`,
            description: `Description ${locale}`,
            image: `https://example.org/${locale}.jpg`,
            videoUrl: `https://example.org/${locale}.mp4`,
        },
    ]));
    const parsed = (0, admin_create_core_1.parseCampaignCreatePayload)(validBody({ translations }), emptyExtras);
    const memory = memoryDependencies();
    await (0, admin_create_core_1.createCampaignCreator)(memory.dependencies)(parsed);
    strict_1.default.deepEqual(memory.state.translations.map((translation) => translation.locale).sort(), ["de", "en", "es", "fr", "id", "pt", "tr"]);
});
(0, node_test_1.default)("rolls back the campaign when any translation fails", async () => {
    const parsed = (0, admin_create_core_1.parseCampaignCreatePayload)(validBody({
        translations: {
            en: { title: "English", description: "English description" },
            fr: { title: "Français", description: "Description française" },
        },
    }), emptyExtras);
    const memory = memoryDependencies({ failLocale: "fr" });
    await strict_1.default.rejects((0, admin_create_core_1.createCampaignCreator)(memory.dependencies)(parsed), /translation fr failed/);
    strict_1.default.equal(memory.state.campaigns.length, 0);
    strict_1.default.equal(memory.state.translations.length, 0);
});
(0, node_test_1.default)("rejects missing and inactive category IDs before creation", async () => {
    for (const categories of [
        [{ id: OTHER_CATEGORY_ID, isActive: true }],
        [{ id: CATEGORY_ID, isActive: false }],
    ]) {
        const parsed = (0, admin_create_core_1.parseCampaignCreatePayload)(validBody(), emptyExtras);
        const memory = memoryDependencies({ categories });
        await strict_1.default.rejects((0, admin_create_core_1.createCampaignCreator)(memory.dependencies)(parsed), admin_create_core_1.CampaignCreateValidationError);
        strict_1.default.equal(memory.state.campaigns.length, 0);
    }
});
(0, node_test_1.default)("rejects an empty Arabic title and malformed category IDs", () => {
    strict_1.default.throws(() => (0, admin_create_core_1.parseCampaignCreatePayload)(validBody({ title: "   " }), emptyExtras), /Arabic title is required/);
    strict_1.default.throws(() => (0, admin_create_core_1.parseCampaignCreatePayload)(validBody({ categoryIds: ["bad-id"] }), emptyExtras), /Invalid categoryId format/);
});
(0, node_test_1.default)("generates a unique non-empty slug when titles collide", async () => {
    const parsed = (0, admin_create_core_1.parseCampaignCreatePayload)(validBody({ slug: "same-title" }), emptyExtras);
    const memory = memoryDependencies({ existingSlugs: ["same-title"] });
    await (0, admin_create_core_1.createCampaignCreator)(memory.dependencies)(parsed);
    strict_1.default.equal(memory.state.campaigns[0].slug, "same-title-2");
    strict_1.default.notEqual(memory.state.campaigns[0].slug, "");
});
(0, node_test_1.default)("mass-assigned fields never reach campaign persistence", async () => {
    const parsed = (0, admin_create_core_1.parseCampaignCreatePayload)(validBody({
        id: "attacker-id",
        createdAt: "2000-01-01",
        donations: [{ amount: 999999 }],
        isDeleted: true,
        translations: { en: { title: "English", description: "Description" } },
    }), emptyExtras);
    const memory = memoryDependencies();
    await (0, admin_create_core_1.createCampaignCreator)(memory.dependencies)(parsed);
    const persisted = memory.state.campaigns[0];
    strict_1.default.equal("id" in persisted, false);
    strict_1.default.equal("createdAt" in persisted, false);
    strict_1.default.equal("donations" in persisted, false);
    strict_1.default.equal("isDeleted" in persisted, false);
    strict_1.default.equal("translations" in persisted, false);
});
(0, node_test_1.default)("campaign creation permission allows ADMIN and campaigns STAFF only", () => {
    strict_1.default.equal((0, permissions_1.sessionHasDashboardPermission)(sessionFor("ADMIN"), "campaigns"), true);
    strict_1.default.equal((0, permissions_1.sessionHasDashboardPermission)(sessionFor("STAFF", ["campaigns"]), "campaigns"), true);
    strict_1.default.equal((0, permissions_1.sessionHasDashboardPermission)(sessionFor("STAFF", ["blog"]), "campaigns"), false);
    strict_1.default.equal((0, permissions_1.sessionHasDashboardPermission)(sessionFor("DONOR"), "campaigns"), false);
});
