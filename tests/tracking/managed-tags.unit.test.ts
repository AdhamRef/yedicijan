import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node test runner tsx requires explicit TS path
import * as managedModule from "../../lib/tracking/managed-tags.ts";
const tags = (managedModule as typeof managedModule & { default?: typeof managedModule }).default ?? managedModule;

test("Clarity/GTM strict allowlist rejects HTML, JS, malformed IDs and unknown keys",()=>{
  for (const raw of [
    { clarityProjectId:"<script>alert(1)</script>",clarityEnabled:true,gtmContainerId:"GTM-ABCD",gtmEnabled:true },
    { clarityProjectId:"u614k028k2",clarityEnabled:true,gtmContainerId:"GTM-<IMG>",gtmEnabled:true },
    { clarityProjectId:"ab",clarityEnabled:true,gtmContainerId:"GTM-ABCD",gtmEnabled:true },
    { clarityProjectId:"u614k028k2",clarityEnabled:true,gtmContainerId:"GTM-",gtmEnabled:true },
    { clarityProjectId:"u614k028k2",clarityEnabled:"true",gtmContainerId:"GTM-ABCD",gtmEnabled:true },
    { clarityProjectId:"u614k028k2",clarityEnabled:true,gtmContainerId:"GTM-ABCD",gtmEnabled:true,gaApiSecret:"leak" },
  ]) assert.throws(()=>tags.validateManagedTagsInput(raw));
  assert.deepEqual(tags.validateManagedTagsInput({
    clarityProjectId:" u614k028k2 ",clarityEnabled:true,
    gtmContainerId:" gtm-abcd1234 ",gtmEnabled:true,
  }),{
    clarityProjectId:"u614k028k2",clarityEnabled:true,
    gtmContainerId:"GTM-ABCD1234",gtmEnabled:true,
  });
});
test("legacy tags remain visible until first explicit save; explicit disable wins",()=>{
  const old=tags.effectiveManagedTags({facebookPixelId:"synthetic-existing-pixel"});
  assert.equal(old.clarity.id,"u614k028k2");assert.equal(old.gtm.id,"GTM-MMNBQQWB");
  assert.equal(old.clarity.source,"legacy");assert.equal(old.gtm.enabled,true);
  const updated=tags.effectiveManagedTags({
    facebookPixelId:"synthetic-existing-pixel",clarityProjectId:"u614k028k2",clarityEnabled:false,
    gtmContainerId:"GTM-ABCD",gtmEnabled:false,
  });
  assert.equal(updated.clarity.enabled,false);assert.equal(updated.gtm.enabled,false);
  assert.equal(updated.gtm.source,"database");
  assert.equal(tags.shouldLoadManagedTag(old.gtm,null),false);
  assert.equal(tags.shouldLoadManagedTag(old.gtm,"denied"),false);
  assert.equal(tags.shouldLoadManagedTag(old.gtm,"granted"),true);
  assert.equal(tags.shouldLoadManagedTag(updated.gtm,"granted"),false);
});

test("single consent authority denies missing/denied and sensitive routes", async () => {
  const consent = await import("../../lib/tracking/consent");
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis,"document");
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis,"window");
  try {
    const fakeDocument = { cookie: "" };
    Object.defineProperty(globalThis,"document",{value:fakeDocument,configurable:true,writable:true});
    Object.defineProperty(globalThis,"window",{value:{location:{protocol:"https:",pathname:"/en/privacy"},dispatchEvent(){}},configurable:true,writable:true});
    assert.equal(consent.readTrackingConsent(),null);
    assert.equal(consent.canRunOptionalTracking("/en/privacy"),false);
    fakeDocument.cookie="yedi_analytics_consent=denied";
    assert.equal(consent.canRunOptionalTracking("/en/privacy"),false);
    globalThis.document.cookie="yedi_analytics_consent=granted";
    assert.equal(consent.canRunOptionalTracking("/en/privacy"),true);
    for(const path of ["/en/checkout","/ar/account","/dashboard","/tr/success/receipt-id","/en/payment"]) {
      assert.equal(consent.canRunOptionalTracking(path),false,path);
    }
    assert.equal(consent.canRunOptionalTracking("/en/privacy"),true);
  } finally {
    if(oldDocument) Object.defineProperty(globalThis,"document",oldDocument);
    else Reflect.deleteProperty(globalThis,"document");
    if(oldWindow) Object.defineProperty(globalThis,"window",oldWindow);
    else Reflect.deleteProperty(globalThis,"window");
  }
});


test("privacy: query parameters never expose donor IDs or credentials to marketing SDKs", async () => {
  const consent = await import("../../lib/tracking/consent");
  for (const query of [
    "?email=donor%40fixture.invalid", "?payment_token=secret",
    "?donationId=fixture", "?receipt=fixture", "?code=oauth",
    "?client_secret=pi_fixture", "?id=123", "?utm_source=google&email=donor",
  ]) {
    assert.equal(consent.trackingSensitiveQuery(query), true, query);
  }
  for (const query of [
    "", "?utm_source=google&utm_campaign=winter", "?gclid=EAIaIQobChMIabcdef1234",
  ]) assert.equal(consent.trackingSensitiveQuery(query), false, query);
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "document", { value: { cookie: "yedi_analytics_consent=granted" }, configurable: true });
    Object.defineProperty(globalThis, "window", { value: { location: { search: "?email=donor%40fixture.invalid" } }, configurable: true });
    assert.equal(consent.canRunOptionalTracking("/en/about"), false);
    assert.equal(consent.canRunOptionalTracking("/en/about?access_token=fixture"), false);
    assert.equal(consent.canRunOptionalTracking("/en/about?utm_source=google"), false);
    globalThis.window.location.search = "?utm_source=google";
    assert.equal(consent.canRunOptionalTracking("/en/about?utm_source=google"), true);
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("privacy regression: no donor identity in public tracking response or browser vendor matching",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync("app/api/donations/[id]/tracking/route.ts","utf8");
 const pixel=readFileSync("components/TrackingPixels.tsx","utf8");
 const final=readFileSync("components/SuccessFinalConversionTracker.tsx","utf8");
 assert.doesNotMatch(source,/browserAdvancedMatching|buildMetaUserData|donor:\s*\{/);
 assert.doesNotMatch(pixel,/ttq\.identify\s*\(|Object\.assign\(ga4,\s*event\.custom\)/);
 assert.match(final,/canRunOptionalTracking\(window\.location\.pathname\)/);
 const consent=await import("../../lib/tracking/consent");
 for(const path of ["/en/cart","/en/donate","/en/donations/receipt-id",
   "/ar/receipt/abc","/tr/checkout","/de/payment","/fr/account","/pt/success/abc"]){
   assert.equal(consent.trackingSensitivePath(path),true,path);
 }
 assert.equal(consent.trackingSensitivePath("/tr/privacy"),false);
});

test("ad click ID parser rejects PII URLs, emails, separators, and oversized tokens",async()=>{
 const {safeOpaqueClickId}=await import("../../lib/tracking/consent");
 for(const bad of [
   "donor@example.com","https://example.com/?token=secret",
   "phone:+905551234567","secret=token","abc/def","abc%40mail",
   "a".repeat(257),"",undefined,
 ]) assert.equal(safeOpaqueClickId(bad),undefined,String(bad));
 for(const token of ["EAIaIQobChMIabcdef1234","fb.1.1712345678.ABC_DEF-123","tok_abcDEF.12345"]){
   assert.equal(safeOpaqueClickId(token),token);
 }
});
