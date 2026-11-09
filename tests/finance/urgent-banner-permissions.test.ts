import test from "node:test";
import assert from "node:assert/strict";
import { pathToDashboardPermission, userHasDashboardPermission } from "../../lib/dashboard/permissions";

test("urgent banner page uses campaigns permission, not revenue fallback", () => {
  assert.equal(pathToDashboardPermission("/dashboard/urgent-banners"), "campaigns");
  assert.equal(pathToDashboardPermission("/dashboard/urgent-banners/anything"), "campaigns");
});

test("campaign staff can view banners, unrelated staff cannot", () => {
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["campaigns"] }, "campaigns"), true);
  assert.equal(userHasDashboardPermission({ role: "STAFF", dashboardPermissions: ["donors"] }, "campaigns"), false);
  assert.equal(userHasDashboardPermission({ role: "DONOR", dashboardPermissions: ["campaigns"] }, "campaigns"), false);
});

test("donor list page retains separate donor section permission", () => {
  assert.equal(pathToDashboardPermission("/dashboard/users/donors/lists"), "donors");
});
