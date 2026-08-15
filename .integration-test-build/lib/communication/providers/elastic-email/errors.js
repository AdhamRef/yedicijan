"use strict";
/**
 * Safe error codes for the Elastic Email adapter. Never leak the API key or any secret in
 * messages/logs — provider bodies are reduced to a safe code + short scrubbed detail.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELASTIC_EMAIL_REASONS = void 0;
exports.scrubElasticEmail = scrubElasticEmail;
exports.mapElasticEmailError = mapElasticEmailError;
exports.ELASTIC_EMAIL_REASONS = {
    NOT_CONFIGURED: "ELASTIC_EMAIL_NOT_CONFIGURED",
    SENDER_NOT_CONFIGURED: "ELASTIC_EMAIL_SENDER_NOT_CONFIGURED",
    REQUEST_FAILED: "ELASTIC_EMAIL_REQUEST_FAILED",
    INVALID_RESPONSE: "ELASTIC_EMAIL_INVALID_RESPONSE",
    UNAUTHORIZED: "ELASTIC_EMAIL_UNAUTHORIZED",
    RATE_LIMITED: "ELASTIC_EMAIL_RATE_LIMITED",
    REJECTED: "ELASTIC_EMAIL_REJECTED",
};
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Remove anything api-key/token-shaped before logging or storing.
 *
 * `secret` is the live API key. Elastic Email echoes the submitted key back inside some 401 bodies,
 * and a key that does not match the generic shape heuristics below would otherwise survive into a
 * stored `detail`. Redacting the known value is the reliable defense; the patterns are the backstop
 * for keys we were not handed (e.g. one embedded in a stack trace from another call site).
 */
function scrubElasticEmail(input, secret) {
    let output = input;
    const trimmed = secret?.trim();
    if (trimmed && trimmed.length >= 8) {
        output = output.replace(new RegExp(escapeRegExp(trimmed), "g"), "***");
    }
    return output
        .replace(/[A-Za-z0-9_-]{32,}/g, "***")
        .replace(/x-elasticemail-apikey[:=]\s*[^&\s"']+/gi, "x-elasticemail-apikey=***")
        .replace(/apikey[:=]\s*[^&\s"']+/gi, "apikey=***")
        .slice(0, 300);
}
/**
 * Map an Elastic Email HTTP failure onto a safe reason code + scrubbed detail.
 * 401/403 → unauthorized, 429 → rate limited, 4xx → rejected (bad payload/sender), 5xx → request failed.
 */
function mapElasticEmailError(status, body, secret) {
    let message = "";
    if (typeof body === "string") {
        message = body;
    }
    else if (body && typeof body === "object") {
        const row = body;
        for (const key of ["Error", "error", "Message", "message", "title", "detail"]) {
            const value = row[key];
            if (typeof value === "string" && value) {
                message = value;
                break;
            }
        }
    }
    // Elastic Email answers auth/account failures with **400 {"Error":"Access Denied."}**, not
    // 401/403. Classifying on status alone therefore reported a dead API key as REJECTED — i.e.
    // "bad payload or unverified sender" — and sent us auditing the request shape while the real
    // cause was the credential. Verified against the live API: with a rejected key, every
    // endpoint (transactional send, statistics, domains, v2 account load) returns this same body.
    const looksUnauthorized = /access denied|unauthorized|invalid\s+api\s*key|apikey.*invalid/i.test(message);
    const reason = status === 401 || status === 403 || (status >= 400 && status < 500 && looksUnauthorized)
        ? exports.ELASTIC_EMAIL_REASONS.UNAUTHORIZED
        : status === 429
            ? exports.ELASTIC_EMAIL_REASONS.RATE_LIMITED
            : status >= 400 && status < 500
                ? exports.ELASTIC_EMAIL_REASONS.REJECTED
                : exports.ELASTIC_EMAIL_REASONS.REQUEST_FAILED;
    return { reason, detail: scrubElasticEmail(`${status}: ${message}`, secret) };
}
