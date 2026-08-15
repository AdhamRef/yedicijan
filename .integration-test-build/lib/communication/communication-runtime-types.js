"use strict";
/**
 * Allowed values for the Communication Center runtime string fields. These mirror the
 * documented values on the Prisma models (stored as strings, not Prisma enums, so the
 * lifecycle can evolve safely on MongoDB). Import these instead of hardcoding literals.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NON_RETRYABLE_TERMINAL = exports.RETRYABLE_STATUSES = exports.PROVIDER_SUCCESS_STATUSES = exports.DELIVERY_STATUSES = exports.DELIVERY_ORIGINS = exports.CAMPAIGN_STATUSES = exports.SENDER_ROUTING_MODES = exports.SENDER_STATUSES = exports.COMMUNICATION_PURPOSES = exports.COMMUNICATION_PROVIDERS = exports.COMMUNICATION_CHANNELS = void 0;
exports.isCommunicationChannel = isCommunicationChannel;
exports.isCommunicationProvider = isCommunicationProvider;
exports.isDeliveryStatus = isDeliveryStatus;
exports.isCampaignStatus = isCampaignStatus;
exports.isProviderSuccessStatus = isProviderSuccessStatus;
exports.COMMUNICATION_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"];
// Final architecture provider ids (ELASTIC_EMAIL / BREVO_SMS / NETGSM_SMS are the active ones;
// META_WHATSAPP for WhatsApp; BREVO_EMAIL + TWILIO + SENDGRID + legacy NETGSM kept so historical
// delivery rows written before the Elastic Email migration still validate).
exports.COMMUNICATION_PROVIDERS = ["META_WHATSAPP", "ELASTIC_EMAIL", "BREVO_EMAIL", "BREVO_SMS", "NETGSM_SMS", "TWILIO", "SENDGRID", "NETGSM", "CUSTOM"];
exports.COMMUNICATION_PURPOSES = ["MARKETING", "UTILITY", "TRANSACTIONAL", "AUTHENTICATION"];
exports.SENDER_STATUSES = ["ACTIVE", "DISABLED", "NEEDS_ATTENTION", "NOT_CONFIGURED"];
exports.SENDER_ROUTING_MODES = ["AUTO", "FIXED"];
exports.CAMPAIGN_STATUSES = [
    "DRAFT",
    "REVIEW",
    "APPROVED",
    "SCHEDULED",
    "SENDING",
    "SENT",
    "CANCELLED",
    "FAILED",
];
exports.DELIVERY_ORIGINS = ["MANUAL", "CAMPAIGN", "TRIGGER", "TEST", "REACTIVATION", "SYSTEM"];
exports.DELIVERY_STATUSES = [
    "DRAFT",
    "QUEUED",
    "RENDERED",
    "SKIPPED",
    "SENT_TO_PROVIDER",
    "SENT",
    "DELIVERED",
    "READ",
    "OPENED",
    "CLICKED",
    "REPLIED",
    "FAILED",
    "BOUNCED",
    "UNSUBSCRIBED",
    "CANCELLED",
];
/**
 * Statuses that assert a real provider accepted/advanced the message. A delivery may
 * only enter one of these when the real provider call succeeded (i.e. a providerMessageId
 * exists or a real provider event was received). Never set these speculatively.
 */
exports.PROVIDER_SUCCESS_STATUSES = [
    "SENT_TO_PROVIDER",
    "SENT",
    "DELIVERED",
    "READ",
    "OPENED",
    "CLICKED",
    "REPLIED",
];
/**
 * Statuses a delivery may be re-sent from: it was never accepted by a provider, so sending again
 * cannot duplicate anything the recipient already has.
 */
exports.RETRYABLE_STATUSES = ["FAILED", "SKIPPED"];
/**
 * Terminal failures that must NOT be retried. A bounce is the receiving server stating the address
 * is undeliverable — re-sending does not fix the address, it only accrues bounce rate, which is the
 * fastest way to get a sending domain throttled or blocklisted.
 */
exports.NON_RETRYABLE_TERMINAL = ["BOUNCED"];
function isCommunicationChannel(v) {
    return typeof v === "string" && exports.COMMUNICATION_CHANNELS.includes(v);
}
function isCommunicationProvider(v) {
    return typeof v === "string" && exports.COMMUNICATION_PROVIDERS.includes(v);
}
function isDeliveryStatus(v) {
    return typeof v === "string" && exports.DELIVERY_STATUSES.includes(v);
}
function isCampaignStatus(v) {
    return typeof v === "string" && exports.CAMPAIGN_STATUSES.includes(v);
}
function isProviderSuccessStatus(v) {
    return exports.PROVIDER_SUCCESS_STATUSES.includes(v);
}
