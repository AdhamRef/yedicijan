import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const page = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");
const api = fs.readFileSync("app/api/admin/dashboard-views/route.ts", "utf8");
test("saved views: own or shared, author-only delete, revenue permission, only known filter keys", () => {
  assert.match(api, /\$or: \[\{ ownerId: me \}, \{ shared: true \}\]/);
  assert.match(api, /q: \{ _id: \{ \$oid: id \}, ownerId: session\?\.user\?\.id \?\? "" \}/);
  assert.match(api, /requireAdminOrDashboardPermission\(session, "revenue"\)/);
  assert.match(api, /KEYS\.filter\(\(k\) => typeof raw\[k\] === "string"\)/);
});
test("saved views are offered on the dashboard (the 'campaign for this result' part is not ported: no smart-audience wizard here)", () => {
  assert.match(page, /fetch\("\/api\/admin\/dashboard-views"/);
  assert.match(page, /\{dt\("حفظ الفلاتر"\)\}/);
  assert.doesNotMatch(page, /campaigns\/new\?audience=/);
});
