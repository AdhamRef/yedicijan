import test from "node:test";
import assert from "node:assert/strict";
import { canDeleteCampaignMedia, normalizeCampaignAssetId } from "../../lib/uploads/campaign-media-access";

function session(role: string, permissions: string[] = []) {
  return { user: { role, dashboardPermissions: permissions } } as Parameters<typeof canDeleteCampaignMedia>[0];
}

test("public and donor users cannot delete shared campaign images", () => {
  assert.equal(canDeleteCampaignMedia(null), false);
  assert.equal(canDeleteCampaignMedia(session("DONOR", ["campaigns"])), false);
  assert.equal(canDeleteCampaignMedia(session("STAFF", ["donors"])), false);
});

test("editorial staff and administrators can delete campaign images", () => {
  assert.equal(canDeleteCampaignMedia(session("STAFF", ["campaigns"])), true);
  assert.equal(canDeleteCampaignMedia(session("STAFF", ["blog"])), true);
  assert.equal(canDeleteCampaignMedia(session("STAFF", ["slides"])), true);
  assert.equal(canDeleteCampaignMedia(session("ADMIN")), true);
});

test("delete is scoped to a campaign image, never an arbitrary cloud folder", () => {
  assert.equal(normalizeCampaignAssetId("photo_123"), "campaigns/photo_123");
  assert.equal(normalizeCampaignAssetId("campaigns/photo_123"), "campaigns/photo_123");
  assert.equal(normalizeCampaignAssetId("avatars/user123"), null);
  assert.equal(normalizeCampaignAssetId("../secrets"), null);
  assert.equal(normalizeCampaignAssetId("campaigns/../../user"), null);
  assert.equal(normalizeCampaignAssetId(""), null);
});
