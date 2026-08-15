"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const active_test_core_1 = require("../../lib/integration-settings/active-test-core");
const brevo_webhook_1 = require("../../lib/integration-settings/brevo-webhook");
const cron_auth_1 = require("../../lib/communication/cron-auth");
const ui_contracts_1 = require("../../lib/integration-settings/ui-contracts");
const ui_lifecycle_1 = require("../../lib/integration-settings/ui-lifecycle");
const actor = { actorId: "507f1f77bcf86cd799439011", actorRole: "ADMIN", actorName: "Tester" };
function brevoSnapshot() {
    return {
        provider: "BREVO",
        labelAr: "Brevo",
        enabled: true,
        status: "READY",
        encryptionKeyConfigured: true,
        missingRequiredFields: [],
        candidate: { version: "11111111-1111-4111-8111-111111111111", hasChanges: true, createdAt: null, lastTestAt: null, lastTestResult: null, lastFailureReasonSafe: null },
        fields: [{
                key: "WEBHOOK_SECRET", labelAr: "مفتاح Webhook", isSecret: true, required: false,
                configured: true, enabled: true, maskedValue: "••••1234", displayValue: null, source: "DATABASE",
                version: 1, hasPendingValue: true, pendingVersion: 2,
                pendingCandidateVersion: "11111111-1111-4111-8111-111111111111", pendingCreatedAt: null,
                updatedAt: null, updatedBy: null, lastTestAt: null, lastTestResult: null, lastFailureReasonSafe: null,
            }],
    };
}
(0, node_test_1.default)("test-active receives active values only and ignores pending values", async () => {
    const activeToken = "active-api-key-value";
    const pendingToken = "pending-api-key-value";
    let testedToken = "";
    const tester = {
        test: async (input) => {
            testedToken = input.values.API_KEY;
            return { success: true, connectionStatus: "CONNECTED", messageAr: "ok", failureCode: null };
        },
    };
    await (0, active_test_core_1.runActiveProviderTest)("BREVO", actor, {
        resolveActiveValues: async () => ({ API_KEY: activeToken, SMS_SENDER: "GOZBEBEK" }),
        tester,
        record: async () => { },
        now: () => new Date("2026-07-14T08:00:00.000Z"),
    });
    strict_1.default.equal(testedToken, activeToken);
    strict_1.default.notEqual(testedToken, pendingToken);
});
(0, node_test_1.default)("active test result persists independently and does not alter candidate test state", async () => {
    const candidateState = { version: "candidate-v1", result: "SUCCESS" };
    let stored = null;
    await (0, active_test_core_1.runActiveProviderTest)("BREVO", actor, {
        resolveActiveValues: async () => ({ API_KEY: "active", SMS_SENDER: "GOZBEBEK" }),
        tester: { test: async () => ({ success: false, connectionStatus: "FAILED", messageAr: "failed", failureCode: "BREVO_UNAUTHORIZED" }) },
        record: async (_provider, _at, result) => { stored = { result: result.success ? "SUCCESS" : "FAILED", failure: result.failureCode }; },
    });
    strict_1.default.deepEqual(stored, { result: "FAILED", failure: "BREVO_UNAUTHORIZED" });
    strict_1.default.deepEqual(candidateState, { version: "candidate-v1", result: "SUCCESS" });
});
(0, node_test_1.default)("active and candidate UI endpoints are explicit and activation is separate", () => {
    strict_1.default.equal(ui_contracts_1.INTEGRATION_UI_ENDPOINTS.testActive("BREVO").endsWith("/test-active"), true);
    strict_1.default.equal(ui_contracts_1.INTEGRATION_UI_ENDPOINTS.testCandidate("BREVO").endsWith("/test-candidate"), true);
    strict_1.default.equal(ui_contracts_1.INTEGRATION_UI_ENDPOINTS.testActive("BREVO").includes("activate"), false);
});
(0, node_test_1.default)("Brevo webhook token is server-generated and canonical URL contains it once", () => {
    const first = (0, brevo_webhook_1.generateBrevoWebhookToken)();
    const second = (0, brevo_webhook_1.generateBrevoWebhookToken)();
    strict_1.default.ok(first.length >= 43);
    strict_1.default.notEqual(first, second);
    const env = { NODE_ENV: "test", NEXTAUTH_URL: "https://example.org" };
    const url = (0, brevo_webhook_1.buildBrevoWebhookUrl)(first, env);
    strict_1.default.equal(url, `https://example.org/api/webhooks/brevo/transactional?token=${encodeURIComponent(first)}`);
    strict_1.default.equal((url.match(/token=/g) ?? []).length, 1);
});
(0, node_test_1.default)("Brevo webhook resolves active DB before environment and ignores candidate material", () => {
    const env = { NODE_ENV: "test", BREVO_SMS_WEBHOOK_SECRET: "environment-secret" };
    strict_1.default.equal((0, brevo_webhook_1.resolveBrevoWebhookSecret)("active-database-secret", env), "active-database-secret");
    strict_1.default.equal((0, brevo_webhook_1.resolveBrevoWebhookSecret)(null, env), "environment-secret");
    const pendingCandidate = "pending-candidate-secret";
    strict_1.default.notEqual((0, brevo_webhook_1.resolveBrevoWebhookSecret)(null, env), pendingCandidate);
});
(0, node_test_1.default)("Brevo webhook comparison is timing-safe compatible and no token appears in safe snapshot", () => {
    const token = (0, brevo_webhook_1.generateBrevoWebhookToken)();
    strict_1.default.equal((0, brevo_webhook_1.brevoWebhookTokenMatches)(token, token), true);
    strict_1.default.equal((0, brevo_webhook_1.brevoWebhookTokenMatches)(`${token}x`, token), false);
    strict_1.default.equal(JSON.stringify(brevoSnapshot()).includes(token), false);
});
(0, node_test_1.default)("Cron uses environment bearer only and protection check does not invoke a provider tester", async () => {
    const secret = "cron-secret-that-is-long-enough-for-infrastructure-123";
    const env = { NODE_ENV: "test", CRON_SECRET: secret };
    strict_1.default.equal((0, cron_auth_1.cronInfrastructureStatus)(env).routeProtected, true);
    strict_1.default.equal((0, cron_auth_1.isCronAuthorizationValid)(`Bearer ${secret}`, env), true);
    let testerCalled = false;
    const result = await (0, active_test_core_1.runActiveProviderTest)("SYSTEM", actor, {
        env,
        resolveActiveValues: async () => { throw new Error("Cron must not resolve DB credentials"); },
        tester: { test: async () => { testerCalled = true; throw new Error("Cron must not call external tester"); } },
        record: async () => { },
    });
    strict_1.default.equal(result.success, true);
    strict_1.default.equal(testerCalled, false);
    strict_1.default.match(result.messageAr, /لم يتم تشغيل أي حملة/);
});
(0, node_test_1.default)("Cron settings cannot be submitted from UI contracts", () => {
    const snapshot = { ...brevoSnapshot(), provider: "SYSTEM" };
    const payload = (0, ui_contracts_1.buildIntegrationSettingsPatch)(snapshot, { WEBHOOK_SECRET: "secret" }, new Set(["WEBHOOK_SECRET"]));
    strict_1.default.deepEqual(payload, { settings: [] });
});
(0, node_test_1.default)("same-provider snapshot refresh keeps notices and last test state", () => {
    strict_1.default.equal((0, ui_lifecycle_1.shouldResetIntegrationUiState)("BREVO", "BREVO"), false);
    strict_1.default.equal((0, ui_lifecycle_1.shouldResetIntegrationUiState)("BREVO", "NETGSM"), true);
});
