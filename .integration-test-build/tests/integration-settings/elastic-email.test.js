"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const catalog_1 = require("../../lib/integration-settings/catalog");
const validation_1 = require("../../lib/integration-settings/validation");
const provider_webhook_1 = require("../../lib/integration-settings/provider-webhook");
const payload_1 = require("../../lib/communication/providers/elastic-email/payload");
const types_1 = require("../../lib/communication/providers/elastic-email/types");
const errors_1 = require("../../lib/communication/providers/elastic-email/errors");
const webhook_events_1 = require("../../lib/communication/providers/elastic-email/webhook-events");
const delivery_status_progress_1 = require("../../lib/communication/delivery-status-progress");
/* ───────────────────────────── catalog / architecture ───────────────────────────── */
(0, node_test_1.default)("Elastic Email is a registered provider and Brevo no longer carries email fields", () => {
    strict_1.default.ok(catalog_1.INTEGRATION_PROVIDERS.includes("ELASTIC_EMAIL"));
    const elastic = (0, catalog_1.getProviderDefinition)("ELASTIC_EMAIL");
    const keys = elastic.fields.map((field) => field.key);
    strict_1.default.deepEqual(keys, ["API_KEY", "SENDER_NAME", "SENDER_EMAIL", "WEBHOOK_SECRET"]);
    strict_1.default.deepEqual(elastic.fields.filter((field) => field.required).map((field) => field.key), ["API_KEY", "SENDER_EMAIL"]);
    strict_1.default.equal(elastic.fields.find((field) => field.key === "API_KEY")?.secret, true);
    strict_1.default.equal(elastic.fields.find((field) => field.key === "SENDER_EMAIL")?.secret, false);
    const brevoKeys = (0, catalog_1.getProviderDefinition)("BREVO").fields.map((field) => field.key);
    strict_1.default.deepEqual(brevoKeys, ["API_KEY", "SMS_SENDER", "WEBHOOK_SECRET"]);
    strict_1.default.equal(brevoKeys.some((key) => key.includes("EMAIL")), false);
});
(0, node_test_1.default)("every provider field maps to a unique environment key", () => {
    const envKeys = Object.values(catalog_1.INTEGRATION_PROVIDER_DEFINITIONS).flatMap((definition) => definition.fields.map((field) => field.envKey));
    strict_1.default.equal(new Set(envKeys).size, envKeys.length, `duplicate env keys: ${envKeys.join(", ")}`);
    for (const field of (0, catalog_1.getProviderDefinition)("ELASTIC_EMAIL").fields) {
        strict_1.default.match(field.envKey, /^ELASTIC_EMAIL_/);
    }
});
(0, node_test_1.default)("Elastic Email field validation rejects bad values", () => {
    strict_1.default.equal((0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "SENDER_EMAIL", " noreply@example.org "), "noreply@example.org");
    strict_1.default.throws(() => (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "SENDER_EMAIL", "not-an-email"));
    strict_1.default.throws(() => (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "API_KEY", "short"));
    strict_1.default.throws(() => (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "UNKNOWN_KEY", "x"));
});
/* ───────────────────────────── send payload ───────────────────────────── */
(0, node_test_1.default)("transactional payload matches the Elastic Email v4 contract", () => {
    const payload = (0, payload_1.buildElasticEmailPayload)({ to: "donor@example.org", subject: "شكرًا لتبرعك", html: "<p>شكرًا</p>", text: "شكرًا" }, { email: "noreply@gozbebekleri.org.tr", name: "Gözbebekleri" });
    strict_1.default.deepEqual(payload.Recipients.To, ["donor@example.org"]);
    strict_1.default.equal(payload.Content.From, "Gözbebekleri <noreply@gozbebekleri.org.tr>");
    strict_1.default.equal(payload.Content.Subject, "شكرًا لتبرعك");
    strict_1.default.deepEqual(payload.Content.Body.map((part) => part.ContentType), ["HTML", "PlainText"]);
    strict_1.default.equal(payload.Content.Body[0].Charset, "utf-8");
    strict_1.default.equal(payload.Options.TrackOpens, true);
});
(0, node_test_1.default)("payload omits the plain-text part when none is rendered", () => {
    const payload = (0, payload_1.buildElasticEmailPayload)({ to: "a@b.org", subject: "s", html: "<p>x</p>" }, { email: "from@b.org", name: "" });
    strict_1.default.equal(payload.Content.Body.length, 1);
    strict_1.default.equal(payload.Content.From, "from@b.org");
});
(0, node_test_1.default)("sender identity quotes display names that would break the From header", () => {
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", null), "a@b.org");
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", "Gözbebekleri"), "Gözbebekleri <a@b.org>");
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", "Charity, Inc <spoof@evil.org>"), '"Charity, Inc <spoof@evil.org>" <a@b.org>');
    strict_1.default.equal((0, types_1.formatSenderIdentity)("a@b.org", "Line\nBreak"), "Line Break <a@b.org>");
});
(0, node_test_1.default)("provider message id is read across response casings", () => {
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({ MessageID: "msg-1" }), "msg-1");
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({ messageId: "msg-2" }), "msg-2");
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({ TransactionID: "tx-3" }), "tx-3");
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)({}), null);
    strict_1.default.equal((0, payload_1.readElasticEmailMessageId)("plain text"), null);
});
/* ───────────────────────────── errors ───────────────────────────── */
(0, node_test_1.default)("HTTP failures map to safe reason codes", () => {
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(401, { Error: "bad key" }).reason, errors_1.ELASTIC_EMAIL_REASONS.UNAUTHORIZED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(403, {}).reason, errors_1.ELASTIC_EMAIL_REASONS.UNAUTHORIZED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(429, {}).reason, errors_1.ELASTIC_EMAIL_REASONS.RATE_LIMITED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(400, { Error: "unverified sender" }).reason, errors_1.ELASTIC_EMAIL_REASONS.REJECTED);
    strict_1.default.equal((0, errors_1.mapElasticEmailError)(503, {}).reason, errors_1.ELASTIC_EMAIL_REASONS.REQUEST_FAILED);
    strict_1.default.match((0, errors_1.mapElasticEmailError)(400, { Error: "unverified sender" }).detail, /unverified sender/);
});
(0, node_test_1.default)("api keys never survive scrubbing", () => {
    const key = "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0";
    strict_1.default.equal((0, errors_1.scrubElasticEmail)(`failed with x-elasticemail-apikey: ${key}`).includes(key), false);
    strict_1.default.equal((0, errors_1.scrubElasticEmail)(`Error 401 for ${key}`).includes(key), false);
    strict_1.default.ok((0, errors_1.scrubElasticEmail)("x".repeat(1000)).length <= 300);
});
(0, node_test_1.default)("a provider body that echoes the live key is redacted in the stored detail", () => {
    // Elastic Email returns the submitted key inside some 401 bodies. A short/odd-shaped key would
    // not match the generic heuristics, so the live value must be redacted explicitly.
    const liveKey = "elastic-key-abcdef0123456789";
    const { detail } = (0, errors_1.mapElasticEmailError)(401, { Error: `Invalid api key ${liveKey}` }, liveKey);
    strict_1.default.equal(detail.includes(liveKey), false, detail);
    strict_1.default.match(detail, /401/);
    // Still scrubbed when the caller does not hand over the key, via the shape heuristics.
    const longKey = "B7f2K9xQ1mW4zR8tY6uL3nH5jP0sD2gV";
    strict_1.default.equal((0, errors_1.scrubElasticEmail)(`401: rejected ${longKey}`).includes(longKey), false);
});
/* ───────────────────────────── webhook normalization ───────────────────────────── */
(0, node_test_1.default)("event names map to delivery statuses regardless of casing or separators", () => {
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Sent"), "SENT");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("delivered"), "DELIVERED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Opened"), "OPENED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Clicked"), "CLICKED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("hard_bounce"), "BOUNCED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("Unsubscribed"), "UNSUBSCRIBED");
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)("something-else"), null);
    strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)(null), null);
});
(0, node_test_1.default)("a spam complaint is an opt-out, not a delivery failure", () => {
    // It used to map to FAILED, which both inflated the failure count and — because
    // nothing downstream reacts to FAILED — left the complainant in every future
    // audience. The message reached them; they opted out in the harshest way.
    for (const name of ["AbuseReport", "abuse", "Spam", "SpamComplaint", "complaint"]) {
        strict_1.default.equal((0, webhook_events_1.mapElasticEmailEventStatus)(name), "UNSUBSCRIBED", `failed for ${name}`);
    }
});
(0, node_test_1.default)("only permanent failures suppress the address", () => {
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("Unsubscribed"), "unsubscribe");
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("AbuseReport"), "complaint");
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("hard_bounce"), "hard-bounce");
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("NotDelivered"), "hard-bounce");
    // A soft bounce is a full mailbox or a temporary DNS failure. Suppressing on
    // it would permanently mute a reachable donor, so it must not.
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("soft_bounce"), "none");
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("Bounced"), "none");
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)("Error"), "none");
    // Engagement never suppresses.
    for (const name of ["Sent", "Delivered", "Opened", "Clicked"]) {
        strict_1.default.equal((0, webhook_events_1.suppressionForEvent)(name), "none", `failed for ${name}`);
    }
    strict_1.default.equal((0, webhook_events_1.suppressionForEvent)(null), "none");
});
(0, node_test_1.default)("normalized events carry their suppression reason", () => {
    const events = (0, webhook_events_1.normalizeElasticEmailEvents)([
        { messageid: "m1", eventtype: "Opened", to: "a@b.org" },
        { messageid: "m2", eventtype: "Unsubscribed", to: "c@d.org" },
        { messageid: "m3", eventtype: "AbuseReport", to: "e@f.org" },
        { messageid: "m4", eventtype: "HardBounce", to: "g@h.org" },
        { messageid: "m5", eventtype: "SoftBounce", to: "i@j.org" },
    ]);
    strict_1.default.deepEqual(events.map((e) => e.suppression), ["none", "unsubscribe", "complaint", "hard-bounce", "none"]);
    // The recipient must survive normalization — it is the only handle the
    // suppression step has on the donor.
    strict_1.default.deepEqual(events.map((e) => e.recipient), ["a@b.org", "c@d.org", "e@f.org", "g@h.org", "i@j.org"]);
});
(0, node_test_1.default)("payload unwrapping handles single objects, arrays, and wrapped collections", () => {
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)({ messageid: "a", eventtype: "Sent" }).length, 1);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)([{ messageid: "a" }, { messageid: "b" }]).length, 2);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)({ Events: [{ messageid: "a" }] }).length, 1);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)(null).length, 0);
    strict_1.default.equal((0, webhook_events_1.extractRawEvents)("nope").length, 0);
});
(0, node_test_1.default)("events normalize across Elastic Email field-name generations", () => {
    const events = (0, webhook_events_1.normalizeElasticEmailEvents)([
        { messageid: "m1", eventtype: "Delivered", to: "a@b.org", date: "2026-08-01T10:00:00Z" },
        { MessageID: "m2", EventType: "Opened", email: "c@d.org" },
        { msgid: "m3", status: "Error", to: "e@f.org", error: "mailbox full" },
    ]);
    strict_1.default.equal(events.length, 3);
    strict_1.default.deepEqual(events.map((event) => event.status), ["DELIVERED", "OPENED", "FAILED"]);
    strict_1.default.deepEqual(events.map((event) => event.providerMessageId), ["m1", "m2", "m3"]);
    strict_1.default.deepEqual(events.map((event) => event.recipient), ["a@b.org", "c@d.org", "e@f.org"]);
    strict_1.default.equal(events[2].errorMessage, "mailbox full");
    // Errors carry the reason; successes must not invent one.
    strict_1.default.equal(events[0].errorMessage, null);
});
(0, node_test_1.default)("unusable events are dropped rather than guessed", () => {
    strict_1.default.deepEqual((0, webhook_events_1.normalizeElasticEmailEvents)([{ eventtype: "Delivered" }]), []); // no message id
    strict_1.default.deepEqual((0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1" }]), []); // no event type
    strict_1.default.deepEqual((0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Queued" }]), []); // unmapped event
});
(0, node_test_1.default)("idempotency keys separate distinct events and repeat for identical ones", () => {
    const [first] = (0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Opened", date: "2026-08-01T10:00:00Z" }]);
    const [again] = (0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Opened", date: "2026-08-01T10:00:00Z" }]);
    const [clicked] = (0, webhook_events_1.normalizeElasticEmailEvents)([{ messageid: "m1", eventtype: "Clicked", date: "2026-08-01T10:00:00Z" }]);
    strict_1.default.equal(first.idempotencyKey, again.idempotencyKey);
    strict_1.default.notEqual(first.idempotencyKey, clicked.idempotencyKey);
});
/* ───────────────────────────── status ladder ───────────────────────────── */
(0, node_test_1.default)("engagement statuses only move forward but terminal outcomes always apply", () => {
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("SENT", "DELIVERED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "OPENED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("OPENED", "CLICKED"), true);
    // Out-of-order webhooks must not downgrade progress.
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("CLICKED", "DELIVERED"), false);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("OPENED", "SENT"), false);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "DELIVERED"), false);
    // Failures are the final word whenever they arrive.
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("CLICKED", "BOUNCED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "UNSUBSCRIBED"), true);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("FAILED", "FAILED"), false);
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)(null, "DELIVERED"), true);
    // Shared with the Brevo SMS webhook: a replayed `sent` after delivery is ignored there too.
    strict_1.default.equal((0, delivery_status_progress_1.shouldApplyDeliveryStatus)("DELIVERED", "SENT"), false);
});
/* ───────────────────────────── pull-based event feed ───────────────────────────── */
/**
 * Verbatim rows from `GET /v4/events` on the live account. The send path can only ever record
 * "the provider returned 2xx"; these are the events that say what happened afterwards, and they
 * are the only thing that can turn an over-optimistic SENT row into the truth.
 */
const LIVE_EVENT_FEED = [
    {
        TransactionID: "f01ce91d-22a4-823d-001d-aef4225c5024",
        MsgID: "ho3apRyH2qK9s5TBPlMkew2",
        FromEmail: "info@gozbebekleri.org",
        To: "salahelnabtity@gamil.com",
        EventType: "Suppress",
        EventDate: "2026-08-06T12:47:46Z",
        MessageCategory: "NotDelivered",
        Message: "Delivery to this domain is not permitted on your account until the trust level of your mail increases.",
    },
    {
        TransactionID: "f01ce904-1ea4-0149-c004-dced3b45495b",
        MsgID: "oxqUU2gsBIPZ_UwdTz2w8g2",
        FromEmail: "info@gozbebekleri.org",
        To: "theaxhunter303@gmail.com",
        EventType: "Error",
        EventDate: "2026-08-06T12:47:41Z",
        MessageCategory: "AccountProblem",
        Message: "Delivery failed due to account problem or spam block. Will attempt again at a later date.",
    },
    { MsgID: "aaa", To: "x@y.com", EventType: "Sent", EventDate: "2026-08-06T05:59:46Z", MessageCategory: "Unknown", Message: "" },
    { MsgID: "bbb", To: "x@y.com", EventType: "Open", EventDate: "2026-08-05T23:01:03Z", MessageCategory: "Unknown", Message: "" },
    { MsgID: "ccc", To: "x@y.com", EventType: "Click", EventDate: "2026-08-05T22:37:16Z", MessageCategory: "Unknown", Message: "" },
    { MsgID: "ddd", To: "x@y.com", EventType: "Submission", EventDate: "2026-08-06T12:47:41Z", MessageCategory: "Unknown", Message: "" },
];
(0, node_test_1.default)("an accepted-then-refused message normalizes to a failure, not a success", () => {
    const events = (0, webhook_events_1.normalizeElasticEmailEvents)(LIVE_EVENT_FEED);
    const suppressed = events.find((e) => e.providerMessageId === "ho3apRyH2qK9s5TBPlMkew2");
    strict_1.default.ok(suppressed, "a Suppress event must not be dropped — it is the whole point of the sync");
    strict_1.default.equal(suppressed.status, "FAILED");
    // Without the reason the operator sees a bare FAILED and still cannot act on it.
    strict_1.default.match(suppressed.errorMessage ?? "", /trust level/);
    const errored = events.find((e) => e.providerMessageId === "oxqUU2gsBIPZ_UwdTz2w8g2");
    strict_1.default.equal(errored?.status, "FAILED");
    strict_1.default.match(errored?.errorMessage ?? "", /account problem or spam block/);
});
(0, node_test_1.default)("the pull feed keys on MsgID and maps the tracked lifecycle events", () => {
    const byId = new Map((0, webhook_events_1.normalizeElasticEmailEvents)(LIVE_EVENT_FEED).map((e) => [e.providerMessageId, e.status]));
    strict_1.default.equal(byId.get("aaa"), "SENT");
    strict_1.default.equal(byId.get("bbb"), "OPENED");
    strict_1.default.equal(byId.get("ccc"), "CLICKED");
    // "Submission" is Elastic Email accepting the payload — exactly the fact the send already
    // recorded. Treating it as a delivery state would re-assert the claim under investigation.
    strict_1.default.equal(byId.has("ddd"), false);
    strict_1.default.equal(byId.size, 5);
});
(0, node_test_1.default)("a success event carries no error text", () => {
    const sent = (0, webhook_events_1.normalizeElasticEmailEvents)(LIVE_EVENT_FEED).find((e) => e.providerMessageId === "aaa");
    strict_1.default.equal(sent?.errorMessage, null);
});
(0, node_test_1.default)("repeated polls of the same feed produce identical idempotency keys", () => {
    const first = (0, webhook_events_1.normalizeElasticEmailEvents)(LIVE_EVENT_FEED).map((e) => e.idempotencyKey);
    const second = (0, webhook_events_1.normalizeElasticEmailEvents)(LIVE_EVENT_FEED).map((e) => e.idempotencyKey);
    strict_1.default.deepEqual(first, second);
    strict_1.default.equal(new Set(first).size, first.length);
});
(0, node_test_1.default)("the events URL sends a naive UTC timestamp, which the API requires", () => {
    const url = (0, payload_1.buildElasticEmailEventsUrl)(new Date("2026-08-06T12:00:00.000Z"), 500);
    strict_1.default.match(url, /^https:\/\/api\.elasticemail\.com\/v4\/events\?/);
    strict_1.default.match(url, /from=2026-08-06T12%3A00%3A00(?!Z)/);
    strict_1.default.equal(url.includes("Z&"), false);
    // The page size is bounded so one poll cannot grow without limit.
    strict_1.default.match((0, payload_1.buildElasticEmailEventsUrl)(new Date("2026-08-06T12:00:00.000Z"), 10_000), /limit=500/);
});
/* ───────────────────────────── webhook token ───────────────────────────── */
(0, node_test_1.default)("Elastic Email webhook token is server-generated and embedded once", () => {
    const token = (0, provider_webhook_1.generateWebhookToken)();
    strict_1.default.ok(token.length >= 43);
    strict_1.default.notEqual(token, (0, provider_webhook_1.generateWebhookToken)());
    const url = (0, provider_webhook_1.buildElasticEmailWebhookUrl)(token, { NODE_ENV: "test", NEXTAUTH_URL: "https://example.org" });
    strict_1.default.equal(url, `https://example.org/api/webhooks/elastic-email?token=${encodeURIComponent(token)}`);
    strict_1.default.equal((url.match(/token=/g) ?? []).length, 1);
});
(0, node_test_1.default)("webhook token comparison rejects wrong and truncated tokens", () => {
    const token = (0, provider_webhook_1.generateWebhookToken)();
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)(token, token), true);
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)(token.slice(0, -1), token), false);
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)("", token), false);
    strict_1.default.equal((0, provider_webhook_1.webhookTokenMatches)(null, token), false);
});
