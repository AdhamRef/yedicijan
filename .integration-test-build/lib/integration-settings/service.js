"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationSettingsService = void 0;
const node_crypto_1 = require("node:crypto");
const catalog_1 = require("./catalog");
const crypto_1 = require("./crypto");
const helpers_1 = require("./helpers");
const provider_testing_1 = require("./provider-testing");
const resolver_1 = require("./resolver");
const validation_1 = require("./validation");
const types_1 = require("./types");
__exportStar(require("./types"), exports);
class IntegrationSettingsService {
    repository;
    auditWriter;
    resolver;
    tester;
    candidateVersion;
    constructor(repository, auditWriter, options = {}) {
        this.repository = repository;
        this.auditWriter = auditWriter;
        this.resolver = new resolver_1.IntegrationSettingsResolver(repository, auditWriter, options);
        this.tester = options.providerTester ?? new provider_testing_1.IntegrationProviderTesterRegistry();
        this.candidateVersion = options.candidateVersion ?? node_crypto_1.randomUUID;
    }
    clearProviderCache(provider) { this.resolver.clearProviderCache(provider); }
    getProviderSnapshot(provider, actor) { return this.resolver.getProviderSnapshot(provider, actor); }
    getResolvedValue(provider, key, actor) { return this.resolver.getResolvedValue(provider, key, actor); }
    getResolvedProviderValues(provider, actor) { return this.resolver.getResolvedProviderValues(provider, actor); }
    getCandidateConfiguration(provider, actor) { return this.resolver.getCandidateConfiguration(provider, actor); }
    audit(entry) { return this.auditWriter.write(entry); }
    fail(ctx, action, reasonCode, key, metadata) {
        return this.audit({ ...ctx, key, action, success: false, metadata: { reasonCode, ...(metadata ?? {}) } });
    }
    async rows(provider, actor, action) {
        try {
            return await this.repository.listByProvider(provider);
        }
        catch {
            await this.fail({ provider, actor }, action, "REPOSITORY_FAILURE");
            throw new types_1.IntegrationSettingsError("REPOSITORY_FAILURE", "Unable to access integration settings");
        }
    }
    base(ctx, key, existing, secret) {
        return {
            provider: ctx.provider,
            key,
            encryptedValue: existing?.encryptedValue ?? null,
            plainValue: existing?.plainValue ?? null,
            isSecret: secret,
            enabled: existing?.enabled ?? true,
            version: existing?.version ?? 0,
            source: "DATABASE",
            pendingEncryptedValue: existing?.pendingEncryptedValue ?? null,
            pendingPlainValue: existing?.pendingPlainValue ?? null,
            pendingVersion: existing?.pendingVersion ?? null,
            pendingCandidateVersion: existing?.pendingCandidateVersion ?? null,
            pendingCreatedAt: existing?.pendingCreatedAt ?? null,
            pendingUpdatedBy: existing?.pendingUpdatedBy ?? null,
            candidateVersion: existing?.candidateVersion ?? null,
            candidateCreatedAt: existing?.candidateCreatedAt ?? null,
            candidateLastTestVersion: existing?.candidateLastTestVersion ?? null,
            candidateLastTestAt: existing?.candidateLastTestAt ?? null,
            candidateLastTestResult: existing?.candidateLastTestResult ?? null,
            candidateFailureReasonSafe: existing?.candidateFailureReasonSafe ?? null,
            updatedBy: ctx.actor.actorId,
            lastTestAt: existing?.lastTestAt ?? null,
            lastTestResult: existing?.lastTestResult ?? null,
            lastFailureReasonSafe: existing?.lastFailureReasonSafe ?? null,
        };
    }
    async saveProviderSettings(provider, inputs, actor) {
        const ctx = { provider, actor };
        const seen = new Set();
        for (const input of inputs) {
            if (!(0, catalog_1.getFieldDefinition)(provider, input.key)) {
                await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "UNKNOWN_FIELD", input.key);
                throw new types_1.IntegrationSettingsError("UNKNOWN_FIELD", "Unknown integration setting field");
            }
            if (seen.has(input.key)) {
                await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "DUPLICATE_FIELD", input.key);
                throw new types_1.IntegrationSettingsError("DUPLICATE_FIELD", "Duplicate integration setting field");
            }
            seen.add(input.key);
        }
        const existingRows = await this.rows(provider, actor, "INTEGRATION_SETTING_SAVE_FAILED");
        const byKey = new Map(existingRows.map((row) => [row.key, row]));
        const prepared = new Map();
        const results = [];
        for (const input of inputs) {
            const field = (0, catalog_1.getFieldDefinition)(provider, input.key);
            if (!input.value.trim()) {
                results.push({ key: input.key, action: "UNCHANGED" });
                continue;
            }
            try {
                prepared.set(input.key, {
                    value: (0, validation_1.validateIntegrationSettingValue)(provider, input.key, input.value),
                    secret: field.secret,
                });
            }
            catch (error) {
                await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "INVALID_FIELD_VALUE", input.key);
                throw error;
            }
        }
        if (!prepared.size)
            return { results, snapshot: await this.getProviderSnapshot(provider, actor) };
        const candidateVersion = this.candidateVersion();
        const now = this.resolver.now();
        const mutations = [];
        const state = byKey.get(helpers_1.PROVIDER_STATE_KEY) ?? null;
        const stateData = this.base(ctx, helpers_1.PROVIDER_STATE_KEY, state, false);
        stateData.candidateVersion = candidateVersion;
        stateData.candidateCreatedAt = now;
        stateData.candidateLastTestVersion = null;
        stateData.candidateLastTestAt = null;
        stateData.candidateLastTestResult = null;
        stateData.candidateFailureReasonSafe = null;
        mutations.push(state
            ? { type: "UPDATE", provider, key: helpers_1.PROVIDER_STATE_KEY, patch: (0, helpers_1.createDataToPatch)(stateData) }
            : { type: "CREATE", data: stateData });
        for (const row of existingRows) {
            if (row.key === helpers_1.PROVIDER_STATE_KEY)
                continue;
            const hasPending = !!(row.pendingEncryptedValue || row.pendingPlainValue);
            if (hasPending && !prepared.has(row.key)) {
                mutations.push({ type: "UPDATE", provider, key: row.key, patch: {
                        pendingCandidateVersion: candidateVersion,
                        pendingCreatedAt: now,
                        pendingUpdatedBy: actor.actorId,
                    } });
            }
        }
        for (const [key, item] of prepared) {
            const field = (0, catalog_1.getFieldDefinition)(provider, key);
            const existing = byKey.get(key) ?? null;
            const data = this.base(ctx, key, existing, field.secret);
            data.pendingVersion = Math.max(existing?.version ?? 0, existing?.pendingVersion ?? 0) + 1;
            data.pendingCandidateVersion = candidateVersion;
            data.pendingCreatedAt = now;
            data.pendingUpdatedBy = actor.actorId;
            if (item.secret) {
                try {
                    data.pendingEncryptedValue = (0, crypto_1.encryptIntegrationSecret)(item.value, (0, crypto_1.integrationSecretContext)(provider, key), this.resolver.encryptionKey());
                    data.pendingPlainValue = null;
                }
                catch (error) {
                    const code = error instanceof crypto_1.IntegrationEncryptionError ? error.code : "ENCRYPTION_KEY_INVALID";
                    await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", code, key);
                    throw new types_1.IntegrationSettingsError(code, "Encryption key is missing or invalid");
                }
            }
            else {
                data.pendingPlainValue = item.value;
                data.pendingEncryptedValue = null;
            }
            mutations.push(existing
                ? { type: "UPDATE", provider, key, patch: (0, helpers_1.createDataToPatch)(data) }
                : { type: "CREATE", data });
            results.push({ key, action: "STAGED" });
        }
        try {
            await this.repository.applyMutations(mutations);
        }
        catch {
            await this.fail(ctx, "INTEGRATION_SETTING_SAVE_FAILED", "REPOSITORY_FAILURE");
            throw new types_1.IntegrationSettingsError("REPOSITORY_FAILURE", "Unable to stage integration settings");
        }
        this.clearProviderCache(provider);
        await this.audit({ ...ctx, action: "INTEGRATION_PROVIDER_CANDIDATE_STAGED", success: true, metadata: { candidateVersion, changedFields: prepared.size } });
        return { results, snapshot: await this.getProviderSnapshot(provider, actor) };
    }
    async testProviderConnection(provider, actor) {
        const ctx = { provider, actor };
        const candidate = await this.getCandidateConfiguration(provider, actor);
        const testedAt = this.resolver.now();
        await this.audit({ ...ctx, action: "INTEGRATION_PROVIDER_TEST_STARTED", success: true, metadata: { candidateVersion: candidate.candidateVersion } });
        if (candidate.missingRequiredFields.length) {
            const failureCode = "MISSING_REQUIRED_FIELDS";
            if (candidate.candidateVersion) {
                await this.repository.recordCandidateTestResult(provider, candidate.candidateVersion, {
                    candidateLastTestVersion: candidate.candidateVersion,
                    candidateLastTestAt: testedAt,
                    candidateLastTestResult: "FAILED",
                    candidateFailureReasonSafe: failureCode,
                });
            }
            this.clearProviderCache(provider);
            await this.fail(ctx, "INTEGRATION_PROVIDER_TEST_FAILED", failureCode, undefined, { candidateVersion: candidate.candidateVersion, missingFields: candidate.missingRequiredFields });
            return { success: false, provider, testedAt: testedAt.toISOString(), candidateVersion: candidate.candidateVersion, connectionStatus: "NOT_CONFIGURED", messageAr: "بيانات المزود المطلوبة غير مكتملة.", failureCode, missingRequiredFields: candidate.missingRequiredFields };
        }
        let result;
        try {
            result = await this.tester.test({ provider, values: candidate.values, candidateVersion: candidate.candidateVersion });
        }
        catch {
            result = { success: false, connectionStatus: "FAILED", messageAr: "تعذر تنفيذ اختبار الاتصال حاليًا.", failureCode: "PROVIDER_TEST_REQUEST_FAILED" };
        }
        if (candidate.candidateVersion) {
            const stored = await this.repository.recordCandidateTestResult(provider, candidate.candidateVersion, {
                candidateLastTestVersion: candidate.candidateVersion,
                candidateLastTestAt: testedAt,
                candidateLastTestResult: result.success ? "SUCCESS" : "FAILED",
                candidateFailureReasonSafe: result.success ? null : (0, helpers_1.safeFailureCode)(result.failureCode),
            });
            if (!stored) {
                await this.fail(ctx, "INTEGRATION_PROVIDER_TEST_RESULT_REJECTED", "CANDIDATE_CHANGED_DURING_TEST", undefined, { candidateVersion: candidate.candidateVersion });
                throw new types_1.IntegrationSettingsError("CANDIDATE_CHANGED_DURING_TEST", "Candidate changed while connection test was running");
            }
        }
        this.clearProviderCache(provider);
        await this.audit({ ...ctx, action: result.success ? "INTEGRATION_PROVIDER_TEST_SUCCEEDED" : "INTEGRATION_PROVIDER_TEST_FAILED", success: result.success, metadata: { candidateVersion: candidate.candidateVersion, ...(result.failureCode ? { failureReasonCode: result.failureCode } : {}) } });
        if (!result.success)
            await this.audit({ ...ctx, action: "INTEGRATION_PROVIDER_ACTIVE_CONFIGURATION_PRESERVED", success: true, metadata: { candidateVersion: candidate.candidateVersion } });
        return { ...result, provider, testedAt: testedAt.toISOString(), candidateVersion: candidate.candidateVersion, missingRequiredFields: [] };
    }
    async activateProviderCandidate(provider, candidateVersion, actor) {
        const ctx = { provider, actor };
        const result = await this.repository.activateCandidateAtomically(provider, candidateVersion, actor.actorId);
        if (result.status !== "ACTIVATED") {
            const code = result.status === "VERSION_MISMATCH" ? "CANDIDATE_VERSION_MISMATCH"
                : result.status === "NOT_VERIFIED" ? "CANDIDATE_NOT_VERIFIED"
                    : result.status === "EMPTY_CANDIDATE" ? "EMPTY_CANDIDATE" : "CANDIDATE_NOT_FOUND";
            await this.fail(ctx, "INTEGRATION_PROVIDER_CANDIDATE_ACTIVATION_REJECTED", code, undefined, { candidateVersion });
            throw new types_1.IntegrationSettingsError(code, "Candidate configuration cannot be activated");
        }
        this.clearProviderCache(provider);
        await this.audit({ ...ctx, action: "INTEGRATION_PROVIDER_CANDIDATE_ACTIVATED", success: true, metadata: { candidateVersion, activatedFields: result.activatedFields } });
        return this.getProviderSnapshot(provider, actor);
    }
    async discardProviderCandidate(provider, candidateVersion, actor, failureReason) {
        const ctx = { provider, actor };
        const result = await this.repository.discardCandidateAtomically(provider, candidateVersion);
        if (result.status !== "DISCARDED") {
            const code = result.status === "VERSION_MISMATCH" ? "CANDIDATE_VERSION_MISMATCH" : "CANDIDATE_NOT_FOUND";
            await this.fail(ctx, "INTEGRATION_PROVIDER_CANDIDATE_DISCARD_REJECTED", code, undefined, { candidateVersion });
            throw new types_1.IntegrationSettingsError(code, "Candidate configuration cannot be discarded");
        }
        this.clearProviderCache(provider);
        const reason = (0, helpers_1.safeFailureCode)(failureReason);
        await this.audit({ ...ctx, action: "INTEGRATION_PROVIDER_CANDIDATE_DISCARDED", success: true, metadata: { candidateVersion, discardedFields: result.discardedFields, ...(reason ? { failureReasonCode: reason } : {}) } });
        return this.getProviderSnapshot(provider, actor);
    }
    async deleteSetting(provider, key, actor) {
        const ctx = { provider, actor };
        if (!(0, catalog_1.getFieldDefinition)(provider, key))
            throw new types_1.IntegrationSettingsError("UNKNOWN_FIELD", "Unknown integration setting field");
        const existing = (await this.rows(provider, actor, "INTEGRATION_SETTING_DELETE_FAILED")).find((row) => row.key === key);
        if (!existing)
            throw new types_1.IntegrationSettingsError("SETTING_NOT_FOUND", "Integration setting was not found");
        await this.repository.applyMutations([{ type: "DELETE", provider, key }]);
        this.clearProviderCache(provider);
        await this.audit({ ...ctx, key, action: "INTEGRATION_SETTING_DELETED", success: true, metadata: { isSecret: existing.isSecret } });
        if ((0, helpers_1.trimEnvValue)(this.resolver.env[(0, catalog_1.getFieldDefinition)(provider, key).envKey]))
            await this.audit({ ...ctx, key, action: "INTEGRATION_SETTING_SOURCE_CHANGED", success: true, metadata: { sourceBefore: "DATABASE", sourceAfter: "ENVIRONMENT" } });
        return this.getProviderSnapshot(provider, actor);
    }
    async setProviderEnabled(provider, enabled, actor) {
        const ctx = { provider, actor };
        const rows = await this.rows(provider, actor, "INTEGRATION_PROVIDER_STATUS_CHANGE_FAILED");
        const existing = rows.find((row) => row.key === helpers_1.PROVIDER_STATE_KEY) ?? null;
        const data = this.base(ctx, helpers_1.PROVIDER_STATE_KEY, existing, false);
        data.enabled = enabled;
        await this.repository.applyMutations([existing ? { type: "UPDATE", provider, key: helpers_1.PROVIDER_STATE_KEY, patch: (0, helpers_1.createDataToPatch)(data) } : { type: "CREATE", data }]);
        this.clearProviderCache(provider);
        await this.audit({ ...ctx, action: enabled ? "INTEGRATION_PROVIDER_ENABLED" : "INTEGRATION_PROVIDER_DISABLED", success: true, metadata: { enabled } });
        return this.getProviderSnapshot(provider, actor);
    }
}
exports.IntegrationSettingsService = IntegrationSettingsService;
