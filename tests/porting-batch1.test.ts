// Porting batch 1 (from Minber): dashboard permissions and account-safety guards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToDashboardPermission, userCanOpenDashboardPath, getFirstAllowedDashboardHref } from "../lib/dashboard/permissions";
import { DASHBOARD_NAV_GROUPS, DASHBOARD_NAV_HREFS_ORDERED, dashboardHrefToPermissionKey } from "../lib/dashboard/nav-config";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const staff = (perms: string[]) => ({ role: "STAFF", dashboardPermissions: perms });

test("telegram needs platformConnectionsAdmin, in the route rule and the sidebar alike", () => {
  assert.equal(pathToDashboardPermission("/dashboard/telegram"), "platformConnectionsAdmin");
  assert.equal(userCanOpenDashboardPath(staff(["revenue"]), "/dashboard/telegram"), false);
  assert.equal(userCanOpenDashboardPath(staff(["platformConnectionsAdmin"]), "/dashboard/telegram"), true);
  assert.equal(dashboardHrefToPermissionKey("/dashboard/telegram"), "platformConnectionsAdmin");
});

test("every sidebar page opens for a staff member holding exactly its key", () => {
  for (const group of DASHBOARD_NAV_GROUPS) {
    for (const item of group.items) {
      assert.equal(userCanOpenDashboardPath(staff([item.key]), item.href), true, `${item.href} with ${item.key}`);
    }
  }
});

test("admins open everything; the first allowed page is one the user can actually open", () => {
  assert.equal(userCanOpenDashboardPath({ role: "ADMIN", dashboardPermissions: [] }, "/dashboard/telegram"), true);
  const u = staff(["messages"]);
  const href = getFirstAllowedDashboardHref(u, DASHBOARD_NAV_HREFS_ORDERED, dashboardHrefToPermissionKey);
  assert.ok(href && userCanOpenDashboardPath(u, href), String(href));
  assert.equal(userCanOpenDashboardPath(u, "/dashboard/telegram/"), false, "trailing slash");
});

test("layout guard uses the shared path check", () => {
  const layout = read("app/(dashboard)/dashboard/DashboardLayoutClient.tsx");
  assert.match(layout, /if \(!userCanOpenDashboardPath\(session\.user, pathname\)\)/);
});

test("user update: no password hash in the response, no self role change, conflicts and closed accounts refused", () => {
  const route = read("app/api/users/[id]/route.ts");
  const put = route.slice(route.indexOf("export async function PUT("), route.indexOf("export async function DELETE("));
  assert.match(put, /const \{ password: _password, \.\.\.safeUpdatedUser \} = updatedUser;/);
  assert.doesNotMatch(put, /return NextResponse\.json\(updatedUser\)/);
  assert.match(put, /if \(isSelf && wantsAuthorityChange\)[\s\S]{0,200}status: 409/);
  assert.match(put, /INVALID_ROLE/);
  assert.match(put, /PROFILE_CONFLICT/);
  assert.match(put, /ACCOUNT_CLOSED/);
  assert.match(put, /tx\.user\.updateMany\(\{ where: \{ id: session\.user\.id, role: "ADMIN" \}/);
  assert.match(put, /emailVerified: null/);
});

test("a session whose account is gone or closed keeps no role or dashboard access", () => {
  const opts = read("app/api/auth/[...nextauth]/options.ts");
  assert.match(opts, /if \(!dbUser \|\| dbUser\.email\?\.endsWith\("@deleted\.invalid"\)\) \{\s*session\.user\.role = "DONOR";\s*session\.user\.dashboardPermissions = \[\];/);
});
