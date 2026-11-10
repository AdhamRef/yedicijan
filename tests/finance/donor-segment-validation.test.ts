import test from "node:test";
import assert from "node:assert/strict";
import { validateDonorSelection } from "../../lib/communication/donor-segment-validation";

const id1 = "507f1f77bcf86cd799439011";
const id2 = "507f1f77bcf86cd799439012";
const base = { name: "متبرعو الشتاء", description: "مجموعة داخل يدي جيهان", channel: "EMAIL", donorIds: [id1, id2] };

test("accepts a valid, unique donor segment without changing locales", () => {
  const result = validateDonorSelection({ ...base, donorIds: [id1, id1, id2] });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.donorIds, [id1, id2]);
    assert.equal(result.value.channel, "EMAIL");
    assert.equal(result.value.name, base.name);
  }
});
test("rejects missing or malformed donor IDs", () => {
  assert.equal(validateDonorSelection({ ...base, donorIds: [] }).ok, false);
  assert.equal(validateDonorSelection({ ...base, donorIds: ["random"] }).ok, false);
  assert.equal(validateDonorSelection({ ...base, donorIds: Array(101).fill(id1) }).ok, false);
});
test("rejects unsupported channels, extra fields and language injection", () => {
  assert.equal(validateDonorSelection({ ...base, channel: "SMS" }).ok, false);
  assert.equal(validateDonorSelection({ ...base, channel: "TELEGRAM" }).ok, false);
  assert.equal(validateDonorSelection({ ...base, locale: "ur" }).ok, false);
});
test("enforces display-name and description limits", () => {
  assert.equal(validateDonorSelection({ ...base, name: "  " }).ok, false);
  assert.equal(validateDonorSelection({ ...base, name: "X".repeat(101) }).ok, false);
  assert.equal(validateDonorSelection({ ...base, description: "X".repeat(501) }).ok, false);
  assert.equal(validateDonorSelection({ ...base, channel: "WHATSAPP" }).ok, true);
});

test("rejects unexpected donor selection metadata", () => {
  assert.equal(validateDonorSelection({ ...base, sendNow: true }).ok, false);
  assert.equal(validateDonorSelection({ ...base, donorIds: [id1], channel: "EMAIL", provider: "stripe" }).ok, false);
});
