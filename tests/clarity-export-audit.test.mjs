import assert from "node:assert/strict";
import test from "node:test";
import { auditClarityCsv } from "../scripts/clarity-export-audit.mjs";

test("summarizes safe session and event counts without emitting identifiers or URL parameters", () => {
  const csv = [
    "Session ID,Date,Event Name,URL,Device,Browser,OS",
    'session-private-1,2026-11-02T18:00:00+03:00,rage_click,"https://yedicihan.org/ar/projects/gaza-winter?fbclid=click-secret&email=donor%40example.org#payment",Mobile,"Chrome, Mobile",Android',
    "session-private-1,2026-11-02T18:01:00+03:00,rage_click,/ar/projects/gaza-winter?gclid=another-secret,Mobile,Chrome,Android",
    "session-private-2,2026-11-03T09:00:00+03:00,donation_flow_started,/ar/checkout?email=donor@example.org,Desktop,Safari,macOS",
    "session-private-3,2026-11-03T10:00:00+03:00,donor@example.org,/ar/checkout?token=private,Tablet,Unknown OS,Unknown Browser",
  ].join("\r\n");

  const result = auditClarityCsv(csv);
  const serialized = JSON.stringify(result);

  assert.deepEqual(result.coverage, {
    rows: 4,
    sessions: 3,
    sessionsWithClassifiedEvents: 2,
    rowsWithTimestamp: 4,
    rowsWithEvent: 4,
    unclassifiedEventRows: 1,
    utcDateRange: { first: "2026-11-02", last: "2026-11-03" },
  });
  assert.deepEqual(result.events, {
    donation_flow_started: { rows: 1, sessions: 1 },
    rage_click: { rows: 2, sessions: 1 },
  });
  assert.equal(result.routes["/ar/projects/:route"], 2);
  assert.equal(result.routes["/ar/checkout"], 2);
  assert.equal(result.byHourUtc["2026-11-02T15"], 2);
  assert.equal(result.devices.mobile, 2);
  assert.equal(result.devices.desktop, 1);
  assert.equal(result.devices.tablet, 1);
  assert.equal(result.browsers.chrome, 2);
  assert.equal(result.browsers.safari, 1);
  assert.equal(result.browsers.other, 1);
  assert.doesNotMatch(serialized, /session-private|click-secret|another-secret|donor@example|token=|fbclid|gclid|yedicihan\.org/);
});

test("does not claim unique sessions when the export has no session identifier", () => {
  const result = auditClarityCsv("Date,Event Name,URL\n2026-11-09,first_click,/en/donate");

  assert.equal(result.coverage.sessions, null);
  assert.equal(result.coverage.sessionsWithClassifiedEvents, null);
  assert.equal(result.coverage.rows, 1);
});

test("rejects malformed or unrecognized exports without echoing input", () => {
  assert.throws(() => auditClarityCsv('Session ID,Event Name\n"private-id,first_click'), /unterminated quoted field/);
  assert.throws(() => auditClarityCsv("email,recording link\nsecret@example.org,https://example.test/secret"), /no recognized/);
});
