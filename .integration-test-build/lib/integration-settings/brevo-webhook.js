"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBrevoWebhookToken = generateBrevoWebhookToken;
exports.buildBrevoWebhookUrl = buildBrevoWebhookUrl;
exports.resolveBrevoWebhookSecret = resolveBrevoWebhookSecret;
exports.brevoWebhookTokenMatches = brevoWebhookTokenMatches;
const provider_webhook_1 = require("./provider-webhook");
/** Brevo SMS webhook token helpers. Thin aliases over the shared provider-webhook primitives. */
function generateBrevoWebhookToken() {
    return (0, provider_webhook_1.generateWebhookToken)();
}
function buildBrevoWebhookUrl(token, env = process.env) {
    return (0, provider_webhook_1.buildWebhookUrl)(provider_webhook_1.BREVO_WEBHOOK_PATH, token, env);
}
function resolveBrevoWebhookSecret(activeDatabaseValue, env = process.env) {
    return activeDatabaseValue || env.BREVO_SMS_WEBHOOK_SECRET?.trim() || null;
}
function brevoWebhookTokenMatches(received, expected) {
    return (0, provider_webhook_1.webhookTokenMatches)(received, expected);
}
