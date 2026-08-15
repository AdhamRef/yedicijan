"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const page_access_1 = require("../../lib/integration-settings/page-access");
function sessionFor(role, dashboardPermissions) {
    return {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: {
            id: "test-user",
            name: "Test User",
            email: "test@example.org",
            role,
            dashboardPermissions,
        },
    };
}
(0, node_test_1.default)("unauthenticated users are redirected to sign-in before protected data can load", () => {
    const access = (0, page_access_1.resolveCommunicationConnectionsPageAccess)(null);
    strict_1.default.deepEqual(access, { allowed: false, redirectTo: "/ar/auth/signin" });
});
(0, node_test_1.default)("authenticated users without platformConnections are redirected to their first allowed page", () => {
    // Was ["operations"] -> /dashboard/operations/tasks. That permission key and page went with
    // التشغيل; "donors" stands in as any permission that is not platformConnections.
    const access = (0, page_access_1.resolveCommunicationConnectionsPageAccess)(sessionFor("STAFF", ["donors"]));
    strict_1.default.deepEqual(access, {
        allowed: false,
        redirectTo: "/dashboard/users/donors",
    });
});
(0, node_test_1.default)("authenticated users without any allowed dashboard page are redirected home", () => {
    const access = (0, page_access_1.resolveCommunicationConnectionsPageAccess)(sessionFor("STAFF", []));
    strict_1.default.deepEqual(access, { allowed: false, redirectTo: "/" });
});
(0, node_test_1.default)("authorized users pass the server-side guard", () => {
    const session = sessionFor("STAFF", ["platformConnections"]);
    const access = (0, page_access_1.resolveCommunicationConnectionsPageAccess)(session);
    strict_1.default.equal(access.allowed, true);
    if (access.allowed)
        strict_1.default.equal(access.session.user.id, "test-user");
});
(0, node_test_1.default)("page redirects before actor creation, provider snapshots, or scheduler reads", () => {
    const source = (0, node_fs_1.readFileSync)("app/(dashboard)/dashboard/platform-connections/communication/page.tsx", "utf8");
    const guardIndex = source.indexOf("resolveCommunicationConnectionsPageAccess");
    const redirectIndex = source.indexOf("redirect(access.redirectTo)");
    const actorIndex = source.indexOf("integrationActorFromSession(session)");
    const snapshotIndex = source.indexOf("integrationSettingsService.getProviderSnapshot");
    const schedulerIndex = source.indexOf("getSchedulerStatus()");
    strict_1.default.ok(guardIndex >= 0, "server-side access guard must be present");
    strict_1.default.ok(redirectIndex > guardIndex, "denied users must be redirected server-side");
    strict_1.default.ok(actorIndex > redirectIndex, "actor creation must happen after the redirect guard");
    strict_1.default.ok(snapshotIndex > redirectIndex, "provider snapshots must load after the redirect guard");
    strict_1.default.ok(schedulerIndex > redirectIndex, "scheduler state must load after the redirect guard");
    strict_1.default.doesNotMatch(source, /integrationActorFromSession\(session!\)/);
});
