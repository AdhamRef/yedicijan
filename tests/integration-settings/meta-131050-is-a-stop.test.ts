import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #273 in Yedicihan's opt-in terms (campaigns send only to whatsappOptIn profiles).
const s = fs.readFileSync("lib/communication/webhook-service.ts", "utf8");
test("Meta 131050 (the recipient stopped marketing inside WhatsApp) switches that number's WhatsApp opt-in off", () => {
  assert.match(s, /event\.status === "FAILED" && \/\\b131050\\b\/\.test\(String\(event\.errorMessage \?\? ""\)\)/);
  assert.match(s, /data: \{ whatsappOptIn: false, consentSource: "meta-whatsapp-131050-stop", lastConsentAt: new Date\(\) \}/);
  assert.match(s, /recipient\.replace\(\/\\D\/g, ""\)/, "digits only, for the phone variants");
  assert.doesNotMatch(s, /\x08/, "no stray control characters");
});
test("recording it never blocks the webhook", () => {
  assert.match(s, /131050 opt-out not recorded/);
  const block = s.slice(s.indexOf("Meta 131050"), s.indexOf("131050 opt-out not recorded"));
  assert.match(block, /\.catch\(/);
});
