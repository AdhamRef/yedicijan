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
  const consent = await import("../../lib/tracking/consent.ts");
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
