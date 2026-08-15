"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
(0, node_test_1.default)("campaign POST authorizes before parsing or starting creation", () => {
    const source = (0, node_fs_1.readFileSync)("app/api/campaigns/route.ts", "utf8");
    const post = source.slice(source.indexOf("export async function POST"));
    const authIndex = post.indexOf('requireAdminOrDashboardPermission(session, "campaigns")');
    const jsonIndex = post.indexOf("request.json()");
    const createIndex = post.indexOf("createAdminCampaign(input)");
    strict_1.default.ok(authIndex >= 0);
    strict_1.default.ok(jsonIndex > authIndex);
    strict_1.default.ok(createIndex > jsonIndex);
});
(0, node_test_1.default)("campaign POST delegates to explicit parser and never passes body to Prisma", () => {
    const source = (0, node_fs_1.readFileSync)("app/api/campaigns/route.ts", "utf8");
    const post = source.slice(source.indexOf("export async function POST"));
    strict_1.default.match(post, /parseAdminCampaignCreatePayload\(body\)/);
    strict_1.default.match(post, /createAdminCampaign\(input\)/);
    strict_1.default.doesNotMatch(post, /prisma\.campaign\.create/);
    strict_1.default.doesNotMatch(post, /data:\s*body/);
    strict_1.default.doesNotMatch(post, /\.\.\.body/);
});
(0, node_test_1.default)("campaign update preserves translations omitted from the payload", () => {
    const source = (0, node_fs_1.readFileSync)("app/api/campaigns/[id]/route.ts", "utf8");
    const put = source.slice(source.indexOf("export async function PUT"));
    strict_1.default.match(put, /Object\.entries\(body\.translations\)/);
    strict_1.default.match(put, /campaignTranslation\.upsert/);
    strict_1.default.doesNotMatch(put, /campaignTranslation\.deleteMany/);
    strict_1.default.doesNotMatch(put, /campaignTranslation\.delete\(/);
});
(0, node_test_1.default)("campaign slug changes on update only when slug is intentionally supplied", () => {
    const source = (0, node_fs_1.readFileSync)("app/api/campaigns/[id]/route.ts", "utf8");
    const put = source.slice(source.indexOf("export async function PUT"));
    strict_1.default.match(put, /if \(body\.slug !== undefined\)/);
    strict_1.default.match(put, /currentId:\s*id/);
});
(0, node_test_1.default)("campaign creation uses one transaction for campaign, relations and translations", () => {
    const source = (0, node_fs_1.readFileSync)("lib/campaign/admin-create.ts", "utf8");
    strict_1.default.match(source, /prisma\.\$transaction/);
    strict_1.default.match(source, /tx\.campaign\.create/);
    strict_1.default.match(source, /categories:\s*\{[\s\S]*connect:/);
    strict_1.default.match(source, /tx\.campaignTranslation\.create/);
});
