// Porting batch 8 (from Minber): deleting a user closes the account and keeps every financial record.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const route = readFileSync(join(__dirname, "..", "app/api/users/[id]/route.ts"), "utf8");
const del = route.slice(route.indexOf("export async function DELETE("));

test("closing an account never deletes donations, subscriptions or the user row", () => {
  assert.doesNotMatch(del, /donation\.deleteMany/);
  assert.doesNotMatch(del, /subscription\.deleteMany/);
  assert.doesNotMatch(del, /user\.delete\(/);
  assert.match(del, /email: deletedEmailFor\(id\)/);
  assert.match(del, /password: null/);
});

test("refused for yourself, for admins, for closed accounts and while a plan is live", () => {
  assert.match(del, /You cannot delete your own account/);
  assert.match(del, /ADMIN_ACCOUNT_CHANGE_ROLE_FIRST/);
  assert.match(del, /ACCOUNT_CLOSED/);
  assert.match(del, /ACTIVE_SUBSCRIPTIONS/);
  assert.match(del, /status: \{ in: \['ACTIVE', 'PAUSED'\] \}/);
});

test("sign-in links, sessions, saved cards and the cart go; contact consent is withdrawn", () => {
  for (const m of ["account", "session", "cartItem", "creditCard"]) assert.match(del, new RegExp(`tx\\.${m}\\.deleteMany\\(\\{ where: \\{ userId: id \\} \\}\\)`));
  assert.match(del, /doNotContact: true/);
});

test("audit log records how many donation records were kept", () => {
  assert.match(del, /donationsKept: donationCount/);
});
