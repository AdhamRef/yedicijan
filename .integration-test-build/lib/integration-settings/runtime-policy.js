"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_RUNTIME_POLICY_FAILURE = void 0;
exports.evaluateActiveRuntimePolicy = evaluateActiveRuntimePolicy;
exports.ACTIVE_RUNTIME_POLICY_FAILURE = {
    PROVIDER_DISABLED: "PROVIDER_DISABLED",
    PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
    INTEGRATION_DATABASE_UNAVAILABLE: "INTEGRATION_DATABASE_UNAVAILABLE",
    INTEGRATION_DECRYPTION_FAILED: "INTEGRATION_DECRYPTION_FAILED",
};
function evaluateActiveRuntimePolicy(input) {
    if (input.decryptionFailedFields.length > 0) {
        return {
            configured: false,
            reason: exports.ACTIVE_RUNTIME_POLICY_FAILURE.INTEGRATION_DECRYPTION_FAILED,
            missingFields: [...input.decryptionFailedFields],
        };
    }
    if (!input.databaseAvailable && !input.allowDatabaseFallback) {
        return {
            configured: false,
            reason: exports.ACTIVE_RUNTIME_POLICY_FAILURE.INTEGRATION_DATABASE_UNAVAILABLE,
            missingFields: [],
        };
    }
    if (!input.allowDisabled && !input.enabled) {
        return {
            configured: false,
            reason: exports.ACTIVE_RUNTIME_POLICY_FAILURE.PROVIDER_DISABLED,
            missingFields: [],
        };
    }
    const missingFields = input.requiredFields.filter((key) => !input.values[key]);
    if (missingFields.length > 0) {
        return {
            configured: false,
            reason: exports.ACTIVE_RUNTIME_POLICY_FAILURE.PROVIDER_NOT_CONFIGURED,
            missingFields,
        };
    }
    return { configured: true, reason: null, missingFields: [] };
}
