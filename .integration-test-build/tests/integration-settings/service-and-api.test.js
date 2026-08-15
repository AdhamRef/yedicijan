"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const service_1 = require("../../lib/integration-settings/service");
const api_contracts_1 = require("../../lib/integration-settings/api-contracts");
const permissions_1 = require("../../lib/dashboard/permissions");
const helpers_1 = require("../../lib/integration-settings/helpers");
const KEY = Buffer.alloc(32, 9).toString("base64");
const actor = { actorId: "507f1f77bcf86cd799439011", actorRole: "ADMIN", actorName: "Tester" };
const UUIDS = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
];
class MemoryRepository {
    rows = new Map();
    writes = 0;
    id = 0;
    mapKey(provider, key) { return `${provider}:${key}`; }
    async listByProvider(provider) {
        return [...this.rows.values()].filter((row) => row.provider === provider).map((row) => ({ ...row }));
    }
    async applyMutations(mutations) {
        this.writes += 1;
        const changed = [];
        for (const mutation of mutations) {
            if (mutation.type === "CREATE") {
                const now = new Date();
                const row = { ...mutation.data, id: `id-${++this.id}`, createdAt: now, updatedAt: now };
                this.rows.set(this.mapKey(row.provider, row.key), row);
                changed.push({ ...row });
            }
            else if (mutation.type === "UPDATE") {
                const mapKey = this.mapKey(mutation.provider, mutation.key);
                const existing = this.rows.get(mapKey);
                if (!existing)
                    throw new Error("missing row");
                const row = { ...existing, ...mutation.patch, updatedAt: new Date() };
                this.rows.set(mapKey, row);
                changed.push({ ...row });
            }
            else {
                const mapKey = this.mapKey(mutation.provider, mutation.key);
                const existing = this.rows.get(mapKey);
                if (!existing)
                    throw new Error("missing row");
                this.rows.delete(mapKey);
                changed.push({ ...existing });
            }
        }
        return changed;
    }
    async recordCandidateTestResult(provider, candidateVersion, patch) {
        const key = this.mapKey(provider, helpers_1.PROVIDER_STATE_KEY);
        const state = this.rows.get(key);
        if (!state || state.candidateVersion !== candidateVersion)
            return false;
        this.rows.set(key, { ...state, ...patch, updatedAt: new Date() });
        return true;
    }
    async activateCandidateAtomically(provider, candidateVersion, actorId) {
        const stateKey = this.mapKey(provider, helpers_1.PROVIDER_STATE_KEY);
        const state = this.rows.get(stateKey);
        if (!state?.candidateVersion)
            return { status: "CANDIDATE_NOT_FOUND" };
        if (state.candidateVersion !== candidateVersion)
            return { status: "VERSION_MISMATCH" };
        if (state.candidateLastTestVersion !== candidateVersion || state.candidateLastTestResult !== "SUCCESS" || !state.candidateLastTestAt || !state.candidateCreatedAt || state.candidateLastTestAt < state.candidateCreatedAt)
            return { status: "NOT_VERIFIED" };
        const pending = [...this.rows.values()].filter((row) => row.provider === provider && row.pendingCandidateVersion === candidateVersion);
        if (!pending.length)
            return { status: "EMPTY_CANDIDATE" };
        const next = new Map(this.rows);
        for (const row of pending) {
            next.set(this.mapKey(provider, row.key), {
                ...row,
                encryptedValue: row.isSecret ? row.pendingEncryptedValue : null,
                plainValue: row.isSecret ? null : row.pendingPlainValue,
                version: row.pendingVersion ?? row.version + 1,
                updatedBy: actorId,
                pendingEncryptedValue: null,
                pendingPlainValue: null,
                pendingVersion: null,
                pendingCandidateVersion: null,
                pendingCreatedAt: null,
                pendingUpdatedBy: null,
                lastTestAt: state.candidateLastTestAt,
                lastTestResult: "SUCCESS",
                lastFailureReasonSafe: null,
                updatedAt: new Date(),
            });
        }
        next.set(stateKey, {
            ...state,
            candidateVersion: null,
            candidateCreatedAt: null,
            candidateLastTestVersion: null,
            candidateLastTestAt: null,
            candidateLastTestResult: null,
            candidateFailureReasonSafe: null,
            lastTestAt: state.candidateLastTestAt,
            lastTestResult: "SUCCESS",
            updatedAt: new Date(),
        });
        this.rows.clear();
        for (const [key, value] of next)
            this.rows.set(key, value);
        return { status: "ACTIVATED", activatedFields: pending.length };
    }
    async discardCandidateAtomically(provider, candidateVersion) {
        const stateKey = this.mapKey(provider, helpers_1.PROVIDER_STATE_KEY);
        const state = this.rows.get(stateKey);
        if (!state?.candidateVersion)
            return { status: "CANDIDATE_NOT_FOUND" };
        if (state.candidateVersion !== candidateVersion)
            return { status: "VERSION_MISMATCH" };
        const pending = [...this.rows.values()].filter((row) => row.provider === provider && row.pendingCandidateVersion === candidateVersion);
        for (const row of pending)
            this.rows.set(this.mapKey(provider, row.key), { ...row, pendingEncryptedValue: null, pendingPlainValue: null, pendingVersion: null, pendingCandidateVersion: null, pendingCreatedAt: null, pendingUpdatedBy: null });
        this.rows.set(stateKey, { ...state, candidateVersion: null, candidateCreatedAt: null, candidateLastTestVersion: null, candidateLastTestAt: null, candidateLastTestResult: null, candidateFailureReasonSafe: null });
        return { status: "DISCARDED", discardedFields: pending.length };
    }
}
function setup(options) {
    const repository = new MemoryRepository();
    const audits = [];
    let clock = 1_000;
    let versionIndex = 0;
    let result = options?.result ?? { success: true, connectionStatus: "CONNECTED", messageAr: "نجح الاختبار.", failureCode: null };
    const providerTester = { test: async () => result };
    const service = new service_1.IntegrationSettingsService(repository, { write: async (entry) => { audits.push(entry); } }, {
        env: options?.env ?? { NODE_ENV: "test" },
        encryptionKey: () => KEY,
        now: () => new Date(++clock),
        candidateVersion: () => UUIDS[versionIndex++] ?? crypto.randomUUID(),
        providerTester,
        cacheTtlMs: 60_000,
    });
    return { repository, audits, service, setResult: (next) => { result = next; } };
}
async function expectCode(promise, code) {
    await strict_1.default.rejects(promise, (error) => error instanceof service_1.IntegrationSettingsError && error.code === code);
}
const cronSecret = "cron-secret-that-is-long-enough-for-secure-use-123";
async function activateInitialCron(service) {
    const staged = await service.saveProviderSettings("SYSTEM", [{ key: "CRON_SECRET", value: cronSecret }], actor);
    const version = staged.snapshot.candidate.version;
    await service.testProviderConnection("SYSTEM", actor);
    await service.activateProviderCandidate("SYSTEM", version, actor);
}
(0, node_test_1.default)("public test contract rejects client supplied SUCCESS or FAILED", () => {
    strict_1.default.equal(api_contracts_1.providerConnectionTestSchema.safeParse({}).success, true);
    strict_1.default.equal(api_contracts_1.providerConnectionTestSchema.safeParse({ result: "SUCCESS" }).success, false);
    strict_1.default.equal(api_contracts_1.providerConnectionTestSchema.safeParse({ result: "FAILED" }).success, false);
});
(0, node_test_1.default)("first secret remains pending and is unavailable to active resolution", async () => {
    const { service } = setup();
    const saved = await service.saveProviderSettings("SYSTEM", [{ key: "CRON_SECRET", value: cronSecret }], actor);
    strict_1.default.equal(saved.results[0]?.action, "STAGED");
    strict_1.default.equal(saved.snapshot.fields[0]?.configured, false);
    strict_1.default.equal(saved.snapshot.fields[0]?.hasPendingValue, true);
    strict_1.default.equal(await service.getResolvedValue("SYSTEM", "CRON_SECRET", actor), null);
});
(0, node_test_1.default)("server-side tester result is recorded and secrets never appear in response or audit", async () => {
    const { service, audits } = setup();
    const saved = await service.saveProviderSettings("SYSTEM", [{ key: "CRON_SECRET", value: cronSecret }], actor);
    const response = await service.testProviderConnection("SYSTEM", actor);
    strict_1.default.equal(response.success, true);
    strict_1.default.equal(response.candidateVersion, saved.snapshot.candidate.version);
    strict_1.default.equal(JSON.stringify(response).includes(cronSecret), false);
    strict_1.default.equal(JSON.stringify(audits).includes(cronSecret), false);
    strict_1.default.ok(audits.some((entry) => entry.action === "INTEGRATION_PROVIDER_TEST_STARTED"));
    strict_1.default.ok(audits.some((entry) => entry.action === "INTEGRATION_PROVIDER_TEST_SUCCEEDED"));
});
(0, node_test_1.default)("failed provider test preserves the active configuration", async () => {
    const { service, setResult, audits } = setup();
    await activateInitialCron(service);
    const activeBefore = await service.getResolvedValue("SYSTEM", "CRON_SECRET", actor);
    const replacement = "replacement-cron-secret-that-is-long-enough-456";
    const staged = await service.saveProviderSettings("SYSTEM", [{ key: "CRON_SECRET", value: replacement }], actor);
    setResult({ success: false, connectionStatus: "FAILED", messageAr: "فشل الاختبار.", failureCode: "AUTH_REJECTED" });
    const tested = await service.testProviderConnection("SYSTEM", actor);
    strict_1.default.equal(tested.success, false);
    await expectCode(service.activateProviderCandidate("SYSTEM", staged.snapshot.candidate.version, actor), "CANDIDATE_NOT_VERIFIED");
    strict_1.default.equal(await service.getResolvedValue("SYSTEM", "CRON_SECRET", actor), activeBefore);
    strict_1.default.ok(audits.some((entry) => entry.action === "INTEGRATION_PROVIDER_ACTIVE_CONFIGURATION_PRESERVED"));
});
(0, node_test_1.default)("editing any field after a successful test invalidates the previous candidate version", async () => {
    const { service } = setup({ env: { NODE_ENV: "test", ELASTIC_EMAIL_SENDER_EMAIL: "verified@example.org", ELASTIC_EMAIL_SENDER_NAME: "Gozbebekleri" } });
    const first = await service.saveProviderSettings("ELASTIC_EMAIL", [{ key: "API_KEY", value: "xkeysib-first-api-key-value-123456" }], actor);
    await service.testProviderConnection("ELASTIC_EMAIL", actor);
    const second = await service.saveProviderSettings("ELASTIC_EMAIL", [{ key: "SENDER_NAME", value: "Gözbebekleri" }], actor);
    strict_1.default.notEqual(first.snapshot.candidate.version, second.snapshot.candidate.version);
    await expectCode(service.activateProviderCandidate("ELASTIC_EMAIL", first.snapshot.candidate.version, actor), "CANDIDATE_VERSION_MISMATCH");
    await expectCode(service.activateProviderCandidate("ELASTIC_EMAIL", second.snapshot.candidate.version, actor), "CANDIDATE_NOT_VERIFIED");
});
(0, node_test_1.default)("provider activation commits all candidate fields together", async () => {
    const { service } = setup();
    const staged = await service.saveProviderSettings("ELASTIC_EMAIL", [
        { key: "API_KEY", value: "xkeysib-atomic-api-key-value-123456" },
        { key: "SENDER_EMAIL", value: "verified@example.org" },
        { key: "SENDER_NAME", value: "Gozbebekleri" },
    ], actor);
    const version = staged.snapshot.candidate.version;
    await service.testProviderConnection("ELASTIC_EMAIL", actor);
    await service.activateProviderCandidate("ELASTIC_EMAIL", version, actor);
    const values = await service.getResolvedProviderValues("ELASTIC_EMAIL", actor);
    strict_1.default.equal(values.API_KEY, "xkeysib-atomic-api-key-value-123456");
    strict_1.default.equal(values.SENDER_EMAIL, "verified@example.org");
    strict_1.default.equal(values.SENDER_NAME, "Gozbebekleri");
});
(0, node_test_1.default)("environment fallback participates in candidate configuration", async () => {
    const { service } = setup({ env: { NODE_ENV: "test", ELASTIC_EMAIL_SENDER_EMAIL: "verified@example.org", ELASTIC_EMAIL_SENDER_NAME: "Gozbebekleri" } });
    await service.saveProviderSettings("ELASTIC_EMAIL", [{ key: "API_KEY", value: "xkeysib-candidate-api-key-value-123456" }], actor);
    const candidate = await service.getCandidateConfiguration("ELASTIC_EMAIL", actor);
    strict_1.default.equal(candidate.sources.API_KEY, "CANDIDATE");
    strict_1.default.equal(candidate.sources.SENDER_EMAIL, "ENVIRONMENT");
    strict_1.default.equal(candidate.values.SENDER_EMAIL, "verified@example.org");
    strict_1.default.deepEqual(candidate.missingRequiredFields, []);
});
(0, node_test_1.default)("API contracts and permission boundaries are provider-level", () => {
    strict_1.default.equal(api_contracts_1.providerCandidateActivationSchema.safeParse({ candidateVersion: UUIDS[0] }).success, true);
    strict_1.default.equal(api_contracts_1.providerCandidateActivationSchema.safeParse({ candidateVersion: "old" }).success, false);
    strict_1.default.equal(api_contracts_1.integrationSettingsUpdateSchema.safeParse({ settings: [{ key: "", value: "x" }] }).success, false);
    strict_1.default.equal(api_contracts_1.INTEGRATION_SETTINGS_ROUTE_PERMISSIONS.test, "platformConnectionsTest");
    strict_1.default.equal(api_contracts_1.INTEGRATION_SETTINGS_ROUTE_PERMISSIONS.activateCandidate, "platformConnectionsManage");
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(undefined, "platformConnectionsTest"), false);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)({ role: "STAFF", dashboardPermissions: ["platformConnections"] }, "platformConnectionsTest"), false);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)({ role: "STAFF", dashboardPermissions: ["platformConnectionsTest"] }, "platformConnectionsTest"), true);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)({ role: "STAFF", dashboardPermissions: ["platformConnectionsTest"] }, "platformConnectionsManage"), false);
});
