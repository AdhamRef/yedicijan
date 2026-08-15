"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTEGRATION_SETTINGS_ROUTE_PERMISSIONS = exports.providerCandidateDiscardSchema = exports.providerCandidateActivationSchema = exports.providerConnectionTestSchema = exports.integrationProviderActionSchema = exports.integrationSettingDeleteSchema = exports.integrationSettingsUpdateSchema = void 0;
const zod_1 = require("zod");
exports.integrationSettingsUpdateSchema = zod_1.z.object({
    settings: zod_1.z.array(zod_1.z.object({
        key: zod_1.z.string().min(1).max(80),
        value: zod_1.z.string().max(10_000),
    })).min(1).max(20),
});
exports.integrationSettingDeleteSchema = zod_1.z.object({
    key: zod_1.z.string().min(1).max(80),
    confirm: zod_1.z.literal(true),
});
exports.integrationProviderActionSchema = zod_1.z.object({
    action: zod_1.z.enum(["ENABLE", "DISABLE"]),
});
exports.providerConnectionTestSchema = zod_1.z.object({}).strict();
exports.providerCandidateActivationSchema = zod_1.z.object({
    candidateVersion: zod_1.z.string().uuid(),
});
exports.providerCandidateDiscardSchema = zod_1.z.object({
    candidateVersion: zod_1.z.string().uuid(),
    failureReason: zod_1.z.string().max(96).optional().nullable(),
});
exports.INTEGRATION_SETTINGS_ROUTE_PERMISSIONS = {
    read: "platformConnections",
    save: "platformConnectionsManage",
    test: "platformConnectionsTest",
    activateCandidate: "platformConnectionsManage",
    discardCandidate: "platformConnectionsManage",
    delete: "platformConnectionsAdmin",
    providerStatus: "platformConnectionsAdmin",
};
