"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const runtime_policy_1 = require("../../lib/integration-settings/runtime-policy");
(0, node_test_1.default)("database outage blocks new provider sends even when environment values exist", () => {
    const result = (0, runtime_policy_1.evaluateActiveRuntimePolicy)({
        enabled: true,
        databaseAvailable: false,
        values: { API_KEY: "environment-value", EMAIL_SENDER_EMAIL: "sender@example.org" },
        decryptionFailedFields: [],
        requiredFields: ["API_KEY", "EMAIL_SENDER_EMAIL"],
    });
    strict_1.default.equal(result.configured, false);
    strict_1.default.equal(result.reason, runtime_policy_1.ACTIVE_RUNTIME_POLICY_FAILURE.INTEGRATION_DATABASE_UNAVAILABLE);
});
(0, node_test_1.default)("database outage permits webhook verification fallback only when explicitly allowed", () => {
    const result = (0, runtime_policy_1.evaluateActiveRuntimePolicy)({
        enabled: false,
        databaseAvailable: false,
        values: { APP_SECRET: "environment-secret", WEBHOOK_VERIFY_TOKEN: "environment-token" },
        decryptionFailedFields: [],
        requiredFields: ["APP_SECRET", "WEBHOOK_VERIFY_TOKEN"],
        allowDisabled: true,
        allowDatabaseFallback: true,
    });
    strict_1.default.equal(result.configured, true);
    strict_1.default.equal(result.reason, null);
});
(0, node_test_1.default)("decryption failure remains fail-closed even for webhook fallback", () => {
    const result = (0, runtime_policy_1.evaluateActiveRuntimePolicy)({
        enabled: true,
        databaseAvailable: true,
        values: { APP_SECRET: "environment-secret" },
        decryptionFailedFields: ["APP_SECRET"],
        requiredFields: ["APP_SECRET"],
        allowDisabled: true,
        allowDatabaseFallback: true,
    });
    strict_1.default.equal(result.configured, false);
    strict_1.default.equal(result.reason, runtime_policy_1.ACTIVE_RUNTIME_POLICY_FAILURE.INTEGRATION_DECRYPTION_FAILED);
    strict_1.default.deepEqual(result.missingFields, ["APP_SECRET"]);
});
(0, node_test_1.default)("disabled provider blocks new sends", () => {
    const result = (0, runtime_policy_1.evaluateActiveRuntimePolicy)({
        enabled: false,
        databaseAvailable: true,
        values: { API_KEY: "active-value" },
        decryptionFailedFields: [],
        requiredFields: ["API_KEY"],
    });
    strict_1.default.equal(result.configured, false);
    strict_1.default.equal(result.reason, runtime_policy_1.ACTIVE_RUNTIME_POLICY_FAILURE.PROVIDER_DISABLED);
});
