"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const ui_contracts_1 = require("../../lib/integration-settings/ui-contracts");
const snapshot = {
    provider: "META_WHATSAPP",
    labelAr: "Meta WhatsApp",
    enabled: true,
    status: "READY",
    encryptionKeyConfigured: true,
    missingRequiredFields: [],
    candidate: { version: "11111111-1111-4111-8111-111111111111", hasChanges: true, createdAt: null, lastTestAt: null, lastTestResult: null, lastFailureReasonSafe: null },
    fields: [
        { key: "ACCESS_TOKEN", labelAr: "رمز الوصول", isSecret: true, required: true, configured: true, enabled: true, maskedValue: "••••1234", displayValue: null, source: "DATABASE", version: 1, hasPendingValue: false, pendingVersion: null, pendingCandidateVersion: null, pendingCreatedAt: null, updatedAt: null, updatedBy: null, lastTestAt: null, lastTestResult: null, lastFailureReasonSafe: null },
        { key: "GRAPH_API_VERSION", labelAr: "الإصدار", isSecret: false, required: true, configured: true, enabled: true, maskedValue: null, displayValue: "v23.0", source: "ENVIRONMENT", version: null, hasPendingValue: false, pendingVersion: null, pendingCandidateVersion: null, pendingCreatedAt: null, updatedAt: null, updatedBy: null, lastTestAt: null, lastTestResult: null, lastFailureReasonSafe: null },
    ],
};
(0, node_test_1.default)("saved secrets initialize blank while non-secret display values remain editable", () => {
    const drafts = (0, ui_contracts_1.initializeIntegrationDrafts)(snapshot);
    strict_1.default.equal(drafts.ACCESS_TOKEN, "");
    strict_1.default.equal(drafts.GRAPH_API_VERSION, "v23.0");
    strict_1.default.equal(JSON.stringify(drafts).includes("••••1234"), false);
});
(0, node_test_1.default)("blank secret is omitted while changed non-secret is included", () => {
    const payload = (0, ui_contracts_1.buildIntegrationSettingsPatch)(snapshot, { ACCESS_TOKEN: "", GRAPH_API_VERSION: "v24.0" }, new Set(["ACCESS_TOKEN", "GRAPH_API_VERSION"]));
    strict_1.default.deepEqual(payload, { settings: [{ key: "GRAPH_API_VERSION", value: "v24.0" }] });
});
(0, node_test_1.default)("provider test request cannot contain SUCCESS, FAILED, or credentials", () => {
    const payload = (0, ui_contracts_1.providerConnectionTestBody)();
    strict_1.default.deepEqual(payload, {});
    strict_1.default.equal(JSON.stringify(payload).includes("SUCCESS"), false);
    strict_1.default.equal(JSON.stringify(payload).includes("FAILED"), false);
    strict_1.default.equal((0, ui_contracts_1.payloadContainsSecret)(payload, ["token-secret", "app-secret"]), false);
});
(0, node_test_1.default)("candidate activation and discard payload contain candidateVersion only", () => {
    const body = (0, ui_contracts_1.providerCandidateBody)("11111111-1111-4111-8111-111111111111");
    strict_1.default.deepEqual(Object.keys(body), ["candidateVersion"]);
    strict_1.default.equal(body.candidateVersion, "11111111-1111-4111-8111-111111111111");
});
(0, node_test_1.default)("UI request contracts never require localStorage, sessionStorage, or URL secrets", () => {
    const source = [ui_contracts_1.initializeIntegrationDrafts, ui_contracts_1.buildIntegrationSettingsPatch, ui_contracts_1.providerConnectionTestBody, ui_contracts_1.providerCandidateBody].map(String).join("\n");
    strict_1.default.equal(source.includes("localStorage"), false);
    strict_1.default.equal(source.includes("sessionStorage"), false);
    strict_1.default.equal(source.includes("URLSearchParams"), false);
});
