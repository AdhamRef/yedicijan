"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTEGRATION_UI_ENDPOINTS = void 0;
exports.initializeIntegrationDrafts = initializeIntegrationDrafts;
exports.buildIntegrationSettingsPatch = buildIntegrationSettingsPatch;
exports.providerConnectionTestBody = providerConnectionTestBody;
exports.providerCandidateBody = providerCandidateBody;
exports.payloadContainsSecret = payloadContainsSecret;
exports.INTEGRATION_UI_ENDPOINTS = {
    testActive: (provider) => `/api/admin/integration-settings/${provider}/test-active`,
    testCandidate: (provider) => `/api/admin/integration-settings/${provider}/test-candidate`,
    activateCandidate: (provider) => `/api/admin/integration-settings/${provider}/activate-candidate`,
    discardCandidate: (provider) => `/api/admin/integration-settings/${provider}/discard-candidate`,
    rotateBrevoWebhook: "/api/admin/integration-settings/BREVO/webhook-token",
};
function initializeIntegrationDrafts(snapshot) {
    return Object.fromEntries(snapshot.fields.map((field) => [field.key, field.isSecret ? "" : field.displayValue ?? ""]));
}
function buildIntegrationSettingsPatch(snapshot, drafts, dirtyKeys) {
    if (snapshot.provider === "SYSTEM")
        return { settings: [] };
    return {
        settings: snapshot.fields
            .filter((field) => dirtyKeys.has(field.key))
            .filter((field) => !field.isSecret || (drafts[field.key] ?? "").length > 0)
            .map((field) => ({ key: field.key, value: drafts[field.key] ?? "" })),
    };
}
function providerConnectionTestBody() {
    return {};
}
function providerCandidateBody(candidateVersion) {
    return { candidateVersion };
}
function payloadContainsSecret(payload, secretValues) {
    const serialized = JSON.stringify(payload);
    return secretValues.some((value) => !!value && serialized.includes(value));
}
