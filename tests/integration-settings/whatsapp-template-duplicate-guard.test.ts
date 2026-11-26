import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Ported from Minber al-Aqsa #233 (whatsapp-template-save-recovery). Yedicihan keeps its own
// template dialog, so only the server-side half applies: a retried create never makes a
// second template with the same name.
const route = fs.readFileSync("app/api/templates/whatsapp/route.ts", "utf8");

test("creating a WhatsApp template refuses a duplicate name before creating or publishing to Meta", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  const guard = post.indexOf('code: "WHATSAPP_TEMPLATE_NAME_EXISTS"');
  assert.ok(guard > 0, "duplicate-name guard missing");
  assert.ok(guard < post.indexOf("prisma.whatsappTemplate.create("), "guard must run before create");
  const publish = post.indexOf("publishWhatsappTemplateToMeta(");
  if (publish >= 0) assert.ok(guard < publish, "guard must run before the Meta publish");
  assert.match(post, /status: 409/);
});
