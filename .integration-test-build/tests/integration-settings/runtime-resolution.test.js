"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const resolver_1 = require("../../lib/integration-settings/resolver");
const crypto_1 = require("../../lib/integration-settings/crypto");
const helpers_1 = require("../../lib/integration-settings/helpers");
const KEY = Buffer.alloc(32, 7).toString("base64");
const now = new Date("2026-07-14T10:00:00.000Z");
const base = (provider, key, patch = {}) => ({
    id: `${provider}-${key}`,
    provider,
    key,
    encryptedValue: null,
    plainValue: null,
    isSecret: false,
    enabled: true,
    version: 1,
    source: "DATABASE",
    pendingEncryptedValue: null,
    pendingPlainValue: null,
    pendingVersion: null,
    pendingCandidateVersion: null,
    pendingCreatedAt: null,
    pendingUpdatedBy: null,
    candidateVersion: null,
    candidateCreatedAt: null,
    candidateLastTestVersion: null,
    candidateLastTestAt: null,
    candidateLastTestResult: null,
    candidateFailureReasonSafe: null,
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
    lastTestAt: null,
    lastTestResult: null,
    lastFailureReasonSafe: null,
    ...patch,
});
function repository(rows, unavailable = false) {
    return {
        async listByProvider(provider) {
            if (unavailable)
                throw new Error("db unavailable");
            return rows.filter((row) => row.provider === provider);
        },
        async applyMutations() { return []; },
        async recordCandidateTestResult() { return false; },
        async activateCandidateAtomically() { return { status: "CANDIDATE_NOT_FOUND" }; },
        async discardCandidateAtomically() { return { status: "CANDIDATE_NOT_FOUND" }; },
    };
}
const audit = { write: async () => { } };
function resolver(rows, env, unavailable = false) {
    return new resolver_1.IntegrationSettingsResolver(repository(rows, unavailable), audit, { env, encryptionKey: () => KEY, cacheTtlMs: 1 });
}
(0, node_test_1.default)("active database values override environment fallback", async () => {
    const encrypted = (0, crypto_1.encryptIntegrationSecret)("db-active-key-123456789012345", (0, crypto_1.integrationSecretContext)("ELASTIC_EMAIL", "API_KEY"), KEY);
    const r = resolver([
        base("ELASTIC_EMAIL", "API_KEY", { isSecret: true, encryptedValue: encrypted }),
        base("ELASTIC_EMAIL", "SENDER_EMAIL", { plainValue: "db@example.org" }),
        base("ELASTIC_EMAIL", "SENDER_NAME", { plainValue: "DBSENDER" }),
    ], { NODE_ENV: "test", ELASTIC_EMAIL_API_KEY: "env-key", ELASTIC_EMAIL_SENDER_EMAIL: "env@example.org", ELASTIC_EMAIL_SENDER_NAME: "ENVSENDER" });
    const state = await r.getActiveRuntimeResolution("ELASTIC_EMAIL");
    strict_1.default.equal(state.values.API_KEY, "db-active-key-123456789012345");
    strict_1.default.equal(state.values.SENDER_EMAIL, "db@example.org");
    strict_1.default.equal(state.sources.API_KEY, "DATABASE");
});
(0, node_test_1.default)("environment values fill only missing active fields", async () => {
    const r = resolver([], { NODE_ENV: "test", ELASTIC_EMAIL_API_KEY: "env-api-key-123456789012345", ELASTIC_EMAIL_SENDER_EMAIL: "env@example.org", ELASTIC_EMAIL_SENDER_NAME: "ENVSENDER" });
    const state = await r.getActiveRuntimeResolution("ELASTIC_EMAIL");
    strict_1.default.equal(state.databaseAvailable, true);
    strict_1.default.equal(state.values.API_KEY, "env-api-key-123456789012345");
    strict_1.default.equal(state.sources.API_KEY, "ENVIRONMENT");
});
(0, node_test_1.default)("pending values are never returned by active runtime resolution", async () => {
    const active = (0, crypto_1.encryptIntegrationSecret)("active-api-key-123456789012345", (0, crypto_1.integrationSecretContext)("ELASTIC_EMAIL", "API_KEY"), KEY);
    const pending = (0, crypto_1.encryptIntegrationSecret)("pending-api-key-987654321098765", (0, crypto_1.integrationSecretContext)("ELASTIC_EMAIL", "API_KEY"), KEY);
    const candidateVersion = "11111111-1111-4111-8111-111111111111";
    const r = resolver([
        base("ELASTIC_EMAIL", helpers_1.PROVIDER_STATE_KEY, { candidateVersion }),
        base("ELASTIC_EMAIL", "API_KEY", { isSecret: true, encryptedValue: active, pendingEncryptedValue: pending, pendingVersion: 2, pendingCandidateVersion: candidateVersion }),
        base("ELASTIC_EMAIL", "SENDER_EMAIL", { plainValue: "active@example.org", pendingPlainValue: "pending@example.org", pendingVersion: 2, pendingCandidateVersion: candidateVersion }),
        base("ELASTIC_EMAIL", "SENDER_NAME", { plainValue: "ACTIVE" }),
    ], { NODE_ENV: "test" });
    const state = await r.getActiveRuntimeResolution("ELASTIC_EMAIL");
    strict_1.default.equal(state.values.API_KEY, "active-api-key-123456789012345");
    strict_1.default.equal(state.values.SENDER_EMAIL, "active@example.org");
    strict_1.default.equal(JSON.stringify(state).includes("pending-api-key"), false);
    strict_1.default.equal(JSON.stringify(state).includes("pending@example.org"), false);
});
(0, node_test_1.default)("corrupt active database secret fails closed and does not use environment", async () => {
    const r = resolver([
        base("ELASTIC_EMAIL", "API_KEY", { isSecret: true, encryptedValue: "corrupt-ciphertext" }),
        base("ELASTIC_EMAIL", "SENDER_EMAIL", { plainValue: "db@example.org" }),
        base("ELASTIC_EMAIL", "SENDER_NAME", { plainValue: "DBSENDER" }),
    ], { NODE_ENV: "test", ELASTIC_EMAIL_API_KEY: "valid-environment-key-123456789", ELASTIC_EMAIL_SENDER_EMAIL: "env@example.org", ELASTIC_EMAIL_SENDER_NAME: "ENVSENDER" });
    const state = await r.getActiveRuntimeResolution("ELASTIC_EMAIL");
    strict_1.default.deepEqual(state.decryptionFailedFields, ["API_KEY"]);
    strict_1.default.equal(state.values.API_KEY, undefined);
    strict_1.default.equal(state.sources.API_KEY, "DATABASE");
});
(0, node_test_1.default)("complete database outage permits environment fallback", async () => {
    const r = resolver([], { NODE_ENV: "test", NETGSM_USERCODE: "env-user", NETGSM_PASSWORD: "env-password", NETGSM_HEADER: "ENVHEADER" }, true);
    const state = await r.getActiveRuntimeResolution("NETGSM");
    strict_1.default.equal(state.databaseAvailable, false);
    strict_1.default.equal(state.values.USERCODE, "env-user");
    strict_1.default.equal(state.values.PASSWORD, "env-password");
    strict_1.default.equal(state.sources.USERCODE, "ENVIRONMENT");
});
(0, node_test_1.default)("disabled provider still exposes active secrets to server-only webhook resolution", async () => {
    const appSecret = (0, crypto_1.encryptIntegrationSecret)("active-app-secret-value", (0, crypto_1.integrationSecretContext)("META_WHATSAPP", "APP_SECRET"), KEY);
    const verifyToken = (0, crypto_1.encryptIntegrationSecret)("active-verify-token", (0, crypto_1.integrationSecretContext)("META_WHATSAPP", "WEBHOOK_VERIFY_TOKEN"), KEY);
    const r = resolver([
        base("META_WHATSAPP", helpers_1.PROVIDER_STATE_KEY, { enabled: false }),
        base("META_WHATSAPP", "APP_SECRET", { isSecret: true, encryptedValue: appSecret }),
        base("META_WHATSAPP", "WEBHOOK_VERIFY_TOKEN", { isSecret: true, encryptedValue: verifyToken }),
    ], { NODE_ENV: "test" });
    const state = await r.getActiveRuntimeResolution("META_WHATSAPP");
    strict_1.default.equal(state.enabled, false);
    strict_1.default.equal(state.values.APP_SECRET, "active-app-secret-value");
    strict_1.default.equal(state.values.WEBHOOK_VERIFY_TOKEN, "active-verify-token");
});
