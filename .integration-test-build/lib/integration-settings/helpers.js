"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_TTL_MS = exports.PROVIDER_STATE_KEY = void 0;
exports.trimEnvValue = trimEnvValue;
exports.safeFailureCode = safeFailureCode;
exports.createDataToPatch = createDataToPatch;
exports.recordHasPendingValue = recordHasPendingValue;
exports.sourceBeforeWrite = sourceBeforeWrite;
exports.PROVIDER_STATE_KEY = "__PROVIDER_STATE__";
exports.DEFAULT_CACHE_TTL_MS = 30_000;
function trimEnvValue(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}
function safeFailureCode(value) {
    if (!value)
        return null;
    const candidate = value.trim().toUpperCase();
    return /^[A-Z][A-Z0-9:_-]{0,95}$/.test(candidate)
        ? candidate
        : "PROVIDER_TEST_FAILED";
}
function createDataToPatch(data) {
    const { provider: _provider, key: _key, ...patch } = data;
    return patch;
}
function recordHasPendingValue(record) {
    return !!(record?.pendingEncryptedValue ||
        record?.pendingPlainValue ||
        record?.pendingVersion ||
        record?.pendingCandidateVersion);
}
function sourceBeforeWrite(record, envValue) {
    if (record && (record.encryptedValue || record.plainValue))
        return "DATABASE";
    return envValue ? "ENVIRONMENT" : "NONE";
}
