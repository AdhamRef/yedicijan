// **bold** markers in dashboard content: shown as bold, never as asterisks.
// Relative imports only so the file runs under `node --import tsx --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitBoldMarkers, stripBoldMarkers } from "../lib/text/inline-bold";

test("a fully wrapped title becomes one bold segment", () => {
  assert.deepEqual(splitBoldMarkers("**Mosque Construction Project in Syria**"), [
    { text: "Mosque Construction Project in Syria", bold: true },
  ]);
  assert.deepEqual(splitBoldMarkers("**مشروع حفر بئر مياه سطحي في اليمن**"), [
    { text: "مشروع حفر بئر مياه سطحي في اليمن", bold: true },
  ]);
});

test("bold inside normal text, and stray markers dropped", () => {
  assert.deepEqual(splitBoldMarkers("Help **now** please"), [
    { text: "Help ", bold: false },
    { text: "now", bold: true },
    { text: " please", bold: false },
  ]);
  assert.deepEqual(splitBoldMarkers("odd ** marker"), [{ text: "odd  marker", bold: false }]);
  assert.deepEqual(splitBoldMarkers("plain"), [{ text: "plain", bold: false }]);
  assert.deepEqual(splitBoldMarkers(null), []);
});

test("strip removes every marker for page titles, alt text and search", () => {
  assert.equal(stripBoldMarkers("**Reviving Mosques Project**"), "Reviving Mosques Project");
  assert.equal(stripBoldMarkers("a **b** c ** d"), "a b c  d");
  assert.equal(stripBoldMarkers(undefined), "");
});
