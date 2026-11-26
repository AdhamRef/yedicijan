import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { galleryShownOn } from "../../lib/site-gallery/shared";
// Ported from Minber al-Aqsa #295; the page rule uses Yedicihan's own routes.
const s = fs.readFileSync("components/FieldGallery.tsx", "utf8");
test("field gallery: home and project pages only, one sliding row of square photos, viewer kept", () => {
  assert.match(s, /galleryHiddenOn\(pathname\) \|\| !galleryShownOn\(pathname\)/, "the paying-donor hide rule still applies");
  assert.match(s, /overflowX: "auto", scrollSnapType: "x mandatory"/);
  assert.match(s, /aspectRatio: "1 \/ 1", scrollSnapAlign: "start"/);
  assert.doesNotMatch(s, /gridTemplateColumns/);
  assert.match(s, /role="dialog" aria-modal="true"/);
});
test("shown on this site's home and project pages, nowhere else", () => {
  for (const p of ["/ar", "/en/", "/tr/campaign/6af674e2d1cd34cbb9de7d1a", "/de/campaign/gaza-water"]) assert.equal(galleryShownOn(p), true, p);
  for (const p of ["/ar/campaigns", "/ar/blog", "/en/about-us", "/ar/success/x", "/ar/campaign/x/extra", "/"]) assert.equal(galleryShownOn(p), false, p);
});
