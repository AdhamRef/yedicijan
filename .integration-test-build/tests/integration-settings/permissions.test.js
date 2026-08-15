"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const permissions_1 = require("../../lib/dashboard/permissions");
const staff = (dashboardPermissions) => ({ role: "STAFF", dashboardPermissions });
(0, node_test_1.default)("view permission cannot test, modify, or disable", () => {
    const user = staff(["platformConnections"]);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnections"), true);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnectionsTest"), false);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnectionsManage"), false);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnectionsAdmin"), false);
});
(0, node_test_1.default)("manage permission inherits view and test but not admin", () => {
    const user = staff(["platformConnectionsManage"]);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnections"), true);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnectionsTest"), true);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnectionsManage"), true);
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)(user, "platformConnectionsAdmin"), false);
});
(0, node_test_1.default)("ADMIN role passes server-side integration checks", () => {
    strict_1.default.equal((0, permissions_1.userHasDashboardPermission)({ role: "ADMIN", dashboardPermissions: [] }, "platformConnectionsAdmin"), true);
});
