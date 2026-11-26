import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #275 and adapted to Yedicihan's opt-in fields.
test("the donor profile shows each channel's state from the fields the senders enforce", () => {
  const route = fs.readFileSync("app/api/users/[id]/contact-status/route.ts", "utf8");
  assert.match(route, /requireAdminOrDashboardPermission\(session, "messages"\)/);
  assert.match(route, /whatsappOptIn: true/);
  assert.match(route, /source === "meta-whatsapp-131050-stop"/, "the stop recorded by #273");
  assert.match(route, /source\.startsWith\("elastic-email:"\)/, "the suppression recorded by suppressEmailRecipient");
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/, "read-only");
  const dialog = fs.readFileSync("components/dashboard/ViewUserProfileDialog.tsx", "utf8");
  assert.match(dialog, /\{user\.role === "DONOR" && <DonorContactStatus userId=\{user\.id\} \/>\}/);
});
