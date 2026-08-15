"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const errors_1 = require("../../lib/communication/providers/netgsm/errors");
/**
 * Netgsm answers a rejected send with a non-2xx status whose body still carries the numeric code.
 * The live account currently returns exactly this for every campaign send:
 *
 *   HTTP 406 {"code":"30","msgheaders":null,
 *             "description":"Check the usercode-password information and API access permission"}
 *
 * The adapter used to look only at `res.ok`, so that arrived on the delivery row as
 * NETGSM_REQUEST_FAILED — indistinguishable from a timeout, and pointing at the wrong cause.
 */
(0, node_test_1.default)("a rejected send is read from the body, not just the HTTP status", () => {
    const body = '{"code":"30","msgheaders":null,"description":"Check the usercode-password information and API access permission"}';
    const code = (0, errors_1.readNetgsmCode)(body);
    strict_1.default.equal(code, "30");
    strict_1.default.equal((0, errors_1.mapNetgsmCode)(code).ok, false);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)(code).reason, errors_1.NETGSM_REASONS.UNAUTHORIZED);
});
(0, node_test_1.default)("plain-text code responses are read too", () => {
    strict_1.default.equal((0, errors_1.readNetgsmCode)("30"), "30");
    strict_1.default.equal((0, errors_1.readNetgsmCode)("00 1234567"), "00");
});
(0, node_test_1.default)("a body with no code leaves the transport reason intact", () => {
    strict_1.default.equal((0, errors_1.readNetgsmCode)(""), null);
    strict_1.default.equal((0, errors_1.readNetgsmCode)("<html><title>502 Bad Gateway</title></html>"), null);
    strict_1.default.equal((0, errors_1.readNetgsmCode)('{"error":"boom"}'), null);
});
(0, node_test_1.default)("actionable Netgsm codes map to distinct reasons", () => {
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("00").ok, true);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("30").reason, errors_1.NETGSM_REASONS.UNAUTHORIZED);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("40").reason, errors_1.NETGSM_REASONS.HEADER_NOT_APPROVED);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("20").reason, errors_1.NETGSM_REASONS.MESSAGE_INVALID);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("70").reason, errors_1.NETGSM_REASONS.MESSAGE_INVALID);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("80").reason, errors_1.NETGSM_REASONS.QUOTA_EXCEEDED);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("85").reason, errors_1.NETGSM_REASONS.QUOTA_EXCEEDED);
    // Anything unrecognised must still fail closed rather than pass as a success.
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("51").ok, false);
    strict_1.default.equal((0, errors_1.mapNetgsmCode)("51").reason, errors_1.NETGSM_REASONS.REJECTED);
});
(0, node_test_1.default)("the detail persisted on a delivery row never carries credentials", () => {
    const scrubbed = (0, errors_1.scrubNetgsm)('406: {"usercode":"W2xxxx3F","password":"53secret03","code":"30"}');
    strict_1.default.equal(scrubbed.includes("53secret03"), false);
    strict_1.default.equal(scrubbed.includes("W2xxxx3F"), false);
    strict_1.default.equal((0, errors_1.scrubNetgsm)("Authorization: Basic YWJjOmRlZg==").includes("YWJjOmRlZg=="), false);
});
