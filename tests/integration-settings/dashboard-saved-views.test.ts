import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #283 (saved views half). "Campaign for this result" fills Minber's
// smart audience builder, which Yedicihan does not have, so it is not ported.
const page = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");
const api = fs.readFileSync("app/api/admin/dashboard-views/route.ts", "utf8");
test("saved views: own or shared, author-only delete, revenue permission, only known filter keys", () => {
  assert.match(api, /\$or: \[\{ ownerId: me \}, \{ shared: true \}\]/);
  assert.match(api, /q: \{ _id: \{ \$oid: id \}, ownerId: session\?\.user\?\.id \?\? "" \}/);
  assert.match(api, /requireAdminOrDashboardPermission\(session, "revenue"\)/);
  assert.match(api, /KEYS\.filter\(\(k\) => typeof raw\[k\] === "string"\)/);
  assert.doesNotMatch(api, /donationProviderFilter|donationsTypeFilter/, "only filters this dashboard has");
});
test("the home dashboard saves, restores and deletes views", () => {
  assert.match(page, /fetch\("\/api\/admin\/dashboard-views"/);
  assert.match(page, /applyView\(v\)/);
  assert.match(page, /if \(!v \|\| !v\.mine/);
  assert.doesNotMatch(page, /campaigns\/new\?audience=/);
});
