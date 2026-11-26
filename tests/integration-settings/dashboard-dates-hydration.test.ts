import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const files = ["platform-connections/communication/_components/IntegrationProviderCards.tsx", "security/EmergencySwitch.tsx", "security/SiteSecurityManager.tsx", "security/DonorGatewayOverrides.tsx"].map((f) => `app/(dashboard)/dashboard/${f}`);
test("dashboard dates format with a fixed time zone, so the server and the browser draw the same text (React #418)", () => {
  // The security pages are not in this repo (they come with Minber's #242/#286 work); check the files that exist.
  for (const f of files.filter((p) => fs.existsSync(p))) {
    const s = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(s, /toLocaleString\(\)/, f);
    for (const m of s.matchAll(/toLocaleString\(/g)) assert.match(s.slice(m.index, m.index + 120), /timeZone: "Europe\/Istanbul"/, `${f}: ${s.slice(m.index, m.index + 60)}`);
  }
});
