import test from "node:test";
import assert from "node:assert/strict";
import { mongoRawObject } from "../../lib/db/mongo-raw-command";

test("raw Mongo commands preserve all value types and convert Date to Extended JSON", () => {
  const value = mongoRawObject({
    find: "Donation",
    filter: { _id: { $oid: "507f1f77bcf86cd799439011" }, settledAt: { $gte: new Date("2026-11-09T00:00:00Z") } },
    limit: 20, ok: true, nothing: null,
  });
  assert.deepEqual(value, {
    find: "Donation",
    filter: { _id: { $oid: "507f1f77bcf86cd799439011" }, settledAt: { $gte: { $date: "2026-11-09T00:00:00.000Z" } } },
    limit: 20, ok: true, nothing: null,
  });
});

test("undefined members are removed without altering false/0/null", () => {
  assert.deepEqual(mongoRawObject({ update: "x", updates: [{ q: {}, u: { $set: { active: false, count: 0, optional: undefined, missing: null } } }] }), {
    update: "x", updates: [{ q: {}, u: { $set: { active: false, count: 0, missing: null } } }],
  });
});

test("raw commands reject unsupported objects and invalid numbers", () => {
  assert.throws(() => mongoRawObject({ q: Infinity }), /Non-finite/);
  assert.throws(() => mongoRawObject({ q: new Date("bad") }), /Invalid Date/);
  assert.throws(() => mongoRawObject({ q: () => 1 }), /Unsupported/);
  assert.throws(() => mongoRawObject({ q: new Map() }), /plain/);
  assert.throws(() => mongoRawObject(JSON.parse('{"__proto__": {}}')), /Forbidden/);
});
