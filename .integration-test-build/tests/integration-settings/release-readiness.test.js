"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const release_readiness_1 = require("../../lib/integration-settings/release-readiness");
const validKey = Buffer.alloc(32, 7).toString("base64url");
function safeEnv(overrides = {}) {
    return {
        DATABASE_URL: "mongodb://example.invalid/test",
        INTEGRATION_SETTINGS_ENCRYPTION_KEY: validKey,
        CRON_SECRET: "x".repeat(32),
        NEXTAUTH_URL: "https://example.org",
        NODE_ENV: "production",
        ...overrides,
    };
}
(0, node_test_1.default)("production environment readiness passes with safe required values", () => {
    const checks = (0, release_readiness_1.inspectEnvironment)(safeEnv());
    strict_1.default.equal((0, release_readiness_1.overallStatus)(checks), "PASS");
    strict_1.default.equal(checks.some((check) => check.message.includes(validKey)), false);
});
(0, node_test_1.default)("invalid encryption key, http production URL, and legacy flags block release", () => {
    const checks = (0, release_readiness_1.inspectEnvironment)(safeEnv({
        INTEGRATION_SETTINGS_ENCRYPTION_KEY: "invalid",
        NEXTAUTH_URL: "http://example.org",
        WHATSAPP_LEGACY_TWILIO_ENABLED: "true",
        SENDGRID_FALLBACK_ENABLED: "true",
    }));
    strict_1.default.equal((0, release_readiness_1.overallStatus)(checks), "BLOCKED");
    strict_1.default.equal(checks.filter((check) => check.status === "BLOCKED").length >= 4, true);
});
(0, node_test_1.default)("canonical URL conflicts are warnings without exposing URL values", () => {
    const checks = (0, release_readiness_1.inspectEnvironment)(safeEnv({ APP_URL: "https://app.example.org", NEXTAUTH_URL: "https://auth.example.org" }));
    const conflict = checks.find((check) => check.id === "canonical-url-conflict");
    strict_1.default.equal(conflict?.status, "WARNING");
    strict_1.default.equal(conflict?.message.includes("app.example.org"), false);
});
(0, node_test_1.default)("required migration indexes match expected names and definitions", () => {
    const checks = (0, release_readiness_1.inspectIndexDefinitions)(release_readiness_1.EXPECTED_INTEGRATION_SETTING_INDEXES.map((index) => ({ ...index, key: { ...index.key } })));
    strict_1.default.equal((0, release_readiness_1.overallStatus)(checks), "PASS");
});
(0, node_test_1.default)("conflicting unique index definition blocks migration verification", () => {
    const actual = release_readiness_1.EXPECTED_INTEGRATION_SETTING_INDEXES.map((index) => ({ ...index, key: { ...index.key } }));
    actual[0] = { ...actual[0], unique: false };
    strict_1.default.equal((0, release_readiness_1.overallStatus)((0, release_readiness_1.inspectIndexDefinitions)(actual)), "BLOCKED");
});
(0, node_test_1.default)("preflight and migration verification are read-only and provider-free", () => {
    const preflight = (0, node_fs_1.readFileSync)("scripts/preflight-integration-settings.ts", "utf8");
    const verify = (0, node_fs_1.readFileSync)("scripts/verify-integration-settings-migration.ts", "utf8");
    const inspection = (0, node_fs_1.readFileSync)("scripts/integration-settings-db-inspection.ts", "utf8");
    const combined = `${preflight}\n${verify}\n${inspection}`;
    for (const forbidden of ["createIndexes", ".create(", ".update(", ".delete(", "fetch(", "axios", "sendTemplate", "sendEmail", "sendSms"]) {
        strict_1.default.equal(combined.includes(forbidden), false, `read-only release tools must not contain ${forbidden}`);
    }
    strict_1.default.doesNotMatch(combined, /console\.(log|error)\([^\n]*(encryptedValue|INTEGRATION_SETTINGS_ENCRYPTION_KEY|CRON_SECRET|API_KEY|PASSWORD|ACCESS_TOKEN)/);
});
(0, node_test_1.default)("crypto Prisma webhook integration and Cron routes explicitly use Node runtime", () => {
    const routes = [
        "app/api/webhooks/meta/whatsapp/route.ts",
        "app/api/webhooks/brevo/transactional/route.ts",
        "app/api/cron/communication-run-due/route.ts",
        "app/api/admin/integration-settings/[provider]/route.ts",
        "app/api/admin/integration-settings/[provider]/test-active/route.ts",
        "app/api/admin/integration-settings/[provider]/test-candidate/route.ts",
        "app/api/admin/integration-settings/[provider]/activate-candidate/route.ts",
    ];
    for (const route of routes) {
        strict_1.default.match((0, node_fs_1.readFileSync)(route, "utf8"), /export\s+const\s+runtime\s*=\s*["']nodejs["']/i, `${route} must use Node.js runtime`);
    }
});
(0, node_test_1.default)("migration fails on duplicates and never deletes data or indexes", () => {
    const migration = (0, node_fs_1.readFileSync)("prisma/mongodb-migrations/20260714-integration-settings.ts", "utf8");
    strict_1.default.match(migration, /DUPLICATE_PROVIDER_KEY/);
    strict_1.default.match(migration, /createIndexes/);
    strict_1.default.doesNotMatch(migration, /dropIndexes|dropIndex|deleteMany|deleteOne|dropDatabase|drop:/);
});
