"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BREVO_WEBHOOK_PATH = exports.ELASTIC_EMAIL_WEBHOOK_PATH = void 0;
exports.generateWebhookToken = generateWebhookToken;
exports.buildWebhookUrl = buildWebhookUrl;
exports.webhookTokenMatches = webhookTokenMatches;
exports.buildElasticEmailWebhookUrl = buildElasticEmailWebhookUrl;
exports.resolveElasticEmailWebhookSecret = resolveElasticEmailWebhookSecret;
const node_crypto_1 = require("node:crypto");
const canonical_url_1 = require("./canonical-url");
/**
 * Shared helpers for the query-token protected provider webhooks (Elastic Email delivery events,
 * Brevo SMS events). The token is generated server-side, stored as an encrypted integration secret,
 * and embedded in the URL the admin pastes into the provider console. Comparison is constant-time.
 */
function generateWebhookToken() {
    return (0, node_crypto_1.randomBytes)(32).toString("base64url");
}
function buildWebhookUrl(path, token, env = process.env) {
    return `${(0, canonical_url_1.getCanonicalApplicationUrl)(env)}${path}?token=${encodeURIComponent(token)}`;
}
function webhookTokenMatches(received, expected) {
    if (!received)
        return false;
    const left = Buffer.from(received, "utf8");
    const right = Buffer.from(expected, "utf8");
    if (left.length !== right.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(left, right);
}
exports.ELASTIC_EMAIL_WEBHOOK_PATH = "/api/webhooks/elastic-email";
exports.BREVO_WEBHOOK_PATH = "/api/webhooks/brevo/transactional";
function buildElasticEmailWebhookUrl(token, env = process.env) {
    return buildWebhookUrl(exports.ELASTIC_EMAIL_WEBHOOK_PATH, token, env);
}
function resolveElasticEmailWebhookSecret(activeDatabaseValue, env = process.env) {
    return activeDatabaseValue || env.ELASTIC_EMAIL_WEBHOOK_SECRET?.trim() || null;
}
