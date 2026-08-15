"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationSettingsResolver = void 0;
const catalog_1 = require("./catalog");
const crypto_1 = require("./crypto");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
function isTestResult(value) {
    return value === "SUCCESS" || value === "FAILED";
}
class IntegrationSettingsResolver {
    repository;
    auditWriter;
    env;
    now;
    encryptionKey;
    cacheTtlMs;
    cache = new Map();
    constructor(repository, auditWriter, options = {}) {
        this.repository = repository;
        this.auditWriter = auditWriter;
        this.env = options.env ?? process.env;
        this.cacheTtlMs = Math.min(options.cacheTtlMs ?? helpers_1.DEFAULT_CACHE_TTL_MS, 30_000);
        this.now = options.now ?? (() => new Date());
        this.encryptionKey = options.encryptionKey ?? (() => process.env.INTEGRATION_SETTINGS_ENCRYPTION_KEY);
    }
    clearProviderCache(provider) {
        this.cache.delete(provider);
    }
    async auditFailure(actor, provider, key, action, reasonCode) {
        await this.auditWriter.write({ actor, provider, key, action, success: false, metadata: { reasonCode } });
    }
    decrypt(provider, key, encrypted) {
        return (0, crypto_1.decryptIntegrationSecret)(encrypted, (0, crypto_1.integrationSecretContext)(provider, key), this.encryptionKey());
    }
    async resolveProvider(provider, actor) {
        const cached = this.cache.get(provider);
        if (cached && cached.expiresAt > Date.now())
            return cached.value;
        let records = [];
        let databaseAvailable = true;
        try {
            records = await this.repository.listByProvider(provider);
        }
        catch {
            databaseAvailable = false;
        }
        const stateRecord = records.find((row) => row.key === helpers_1.PROVIDER_STATE_KEY) ?? null;
        const providerEnabled = stateRecord?.enabled ?? true;
        const fields = [];
        for (const field of (0, catalog_1.getProviderDefinition)(provider).fields) {
            const record = databaseAvailable ? records.find((row) => row.key === field.key) ?? null : null;
            if (!record) {
                const envValue = (0, helpers_1.trimEnvValue)(this.env[field.envKey]);
                fields.push({ definition: field, record: null, configured: !!envValue, enabled: true, value: envValue, source: envValue ? "ENVIRONMENT" : "NONE", decryptionFailed: false });
                continue;
            }
            if (!record.enabled) {
                fields.push({ definition: field, record, configured: false, enabled: false, value: null, source: "DATABASE", decryptionFailed: false });
                continue;
            }
            if (field.secret && record.encryptedValue) {
                try {
                    fields.push({ definition: field, record, configured: true, enabled: true, value: this.decrypt(provider, field.key, record.encryptedValue), source: "DATABASE", decryptionFailed: false });
                }
                catch (error) {
                    const code = error instanceof crypto_1.IntegrationEncryptionError ? error.code : "DECRYPTION_FAILED";
                    if (actor)
                        await this.auditFailure(actor, provider, field.key, "INTEGRATION_SETTING_DECRYPT_FAILED", code);
                    fields.push({ definition: field, record, configured: false, enabled: true, value: null, source: "DATABASE", decryptionFailed: true });
                }
                continue;
            }
            if (!field.secret && record.plainValue?.trim()) {
                fields.push({ definition: field, record, configured: true, enabled: true, value: record.plainValue.trim(), source: "DATABASE", decryptionFailed: false });
                continue;
            }
            const envValue = (0, helpers_1.trimEnvValue)(this.env[field.envKey]);
            fields.push({ definition: field, record, configured: !!envValue, enabled: true, value: envValue, source: envValue ? "ENVIRONMENT" : "NONE", decryptionFailed: false });
        }
        const resolved = { provider, enabled: providerEnabled, databaseAvailable, stateRecord, records, fields };
        this.cache.set(provider, { expiresAt: Date.now() + this.cacheTtlMs, value: resolved });
        return resolved;
    }
    async getActiveRuntimeResolution(provider, actor) {
        const resolved = await this.resolveProvider(provider, actor);
        return {
            provider,
            enabled: resolved.enabled,
            databaseAvailable: resolved.databaseAvailable,
            values: Object.fromEntries(resolved.fields.filter((field) => field.configured && field.value).map((field) => [field.definition.key, field.value])),
            sources: Object.fromEntries(resolved.fields.map((field) => [field.definition.key, field.source])),
            missingRequiredFields: resolved.fields.filter((field) => field.definition.required && !field.configured).map((field) => field.definition.key),
            decryptionFailedFields: resolved.fields.filter((field) => field.decryptionFailed).map((field) => field.definition.key),
        };
    }
    async getCandidateConfiguration(provider, actor) {
        const resolved = await this.resolveProvider(provider, actor);
        const candidateVersion = resolved.stateRecord?.candidateVersion ?? null;
        const values = {};
        const sources = {};
        const missingRequiredFields = [];
        for (const field of (0, catalog_1.getProviderDefinition)(provider).fields) {
            const record = resolved.records.find((row) => row.key === field.key) ?? null;
            let value = null;
            if (candidateVersion && record?.pendingCandidateVersion === candidateVersion) {
                try {
                    value = field.secret && record.pendingEncryptedValue
                        ? this.decrypt(provider, field.key, record.pendingEncryptedValue)
                        : record.pendingPlainValue?.trim() || null;
                }
                catch (error) {
                    const code = error instanceof crypto_1.IntegrationEncryptionError ? error.code : "DECRYPTION_FAILED";
                    if (actor)
                        await this.auditFailure(actor, provider, field.key, "INTEGRATION_CANDIDATE_DECRYPT_FAILED", code);
                    throw new types_1.IntegrationSettingsError(code, "Unable to decrypt candidate integration value");
                }
                if (value)
                    sources[field.key] = "CANDIDATE";
            }
            if (!value) {
                const active = resolved.fields.find((item) => item.definition.key === field.key);
                value = active?.value ?? null;
                sources[field.key] = active?.source ?? "NONE";
            }
            if (value)
                values[field.key] = value;
            else if (field.required)
                missingRequiredFields.push(field.key);
        }
        return {
            provider,
            candidateVersion,
            hasPendingChanges: !!candidateVersion && resolved.records.some((row) => row.pendingCandidateVersion === candidateVersion && (0, helpers_1.recordHasPendingValue)(row)),
            values,
            sources,
            missingRequiredFields,
        };
    }
    async getProviderSnapshot(provider, actor) {
        const resolved = await this.resolveProvider(provider, actor);
        const definition = (0, catalog_1.getProviderDefinition)(provider);
        const missingRequiredFields = resolved.fields.filter((field) => field.definition.required && !field.configured).map((field) => field.definition.key);
        const hasDecryptionError = resolved.fields.some((field) => field.decryptionFailed);
        const state = resolved.stateRecord;
        const candidateVersion = state?.candidateVersion ?? null;
        return {
            provider,
            labelAr: definition.labelAr,
            enabled: resolved.enabled,
            status: !resolved.enabled ? "DISABLED" : hasDecryptionError ? "ERROR" : missingRequiredFields.length === 0 ? "READY" : "NOT_CONFIGURED",
            encryptionKeyConfigured: (0, crypto_1.integrationEncryptionKeyIsConfigured)(this.encryptionKey()),
            missingRequiredFields,
            candidate: {
                version: candidateVersion,
                hasChanges: !!candidateVersion && resolved.records.some((row) => row.pendingCandidateVersion === candidateVersion && (0, helpers_1.recordHasPendingValue)(row)),
                createdAt: state?.candidateCreatedAt?.toISOString() ?? null,
                lastTestAt: state?.candidateLastTestAt?.toISOString() ?? null,
                lastTestResult: isTestResult(state?.candidateLastTestResult ?? null) ? state.candidateLastTestResult : null,
                lastFailureReasonSafe: state?.candidateFailureReasonSafe ?? null,
            },
            fields: resolved.fields.map((field) => ({
                key: field.definition.key,
                labelAr: field.definition.labelAr,
                isSecret: field.definition.secret,
                required: field.definition.required,
                configured: field.configured,
                enabled: field.enabled,
                maskedValue: field.definition.secret ? (0, crypto_1.maskIntegrationValue)(field.value) : null,
                displayValue: field.definition.secret ? null : field.value,
                source: field.source,
                version: field.record?.version ?? null,
                hasPendingValue: !!candidateVersion && field.record?.pendingCandidateVersion === candidateVersion && (0, helpers_1.recordHasPendingValue)(field.record),
                pendingVersion: field.record?.pendingVersion ?? null,
                pendingCandidateVersion: field.record?.pendingCandidateVersion ?? null,
                pendingCreatedAt: field.record?.pendingCreatedAt?.toISOString() ?? null,
                updatedAt: field.record?.updatedAt.toISOString() ?? null,
                updatedBy: field.record?.updatedBy ?? null,
                lastTestAt: field.record?.lastTestAt?.toISOString() ?? null,
                lastTestResult: isTestResult(field.record?.lastTestResult ?? null) ? field.record.lastTestResult : null,
                lastFailureReasonSafe: field.record?.lastFailureReasonSafe ?? null,
            })),
        };
    }
    async getResolvedValue(provider, key, actor) {
        if (!(0, catalog_1.getFieldDefinition)(provider, key))
            throw new types_1.IntegrationSettingsError("UNKNOWN_FIELD", "Unknown integration setting field");
        const resolved = await this.resolveProvider(provider, actor);
        if (!resolved.enabled)
            return null;
        return resolved.fields.find((item) => item.definition.key === key)?.value ?? null;
    }
    async getResolvedProviderValues(provider, actor) {
        const resolved = await this.resolveProvider(provider, actor);
        if (!resolved.enabled)
            return {};
        return Object.fromEntries(resolved.fields.filter((field) => field.configured && field.value).map((field) => [field.definition.key, field.value]));
    }
}
exports.IntegrationSettingsResolver = IntegrationSettingsResolver;
