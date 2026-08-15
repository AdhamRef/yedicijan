"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationProviderTesterRegistry = exports.SystemCronConnectionTester = exports.NetgsmConnectionTester = exports.BrevoConnectionTester = exports.ElasticEmailConnectionTester = exports.MetaWhatsAppConnectionTester = void 0;
exports.elasticEmailDomainName = elasticEmailDomainName;
const node_crypto_1 = require("node:crypto");
const validation_1 = require("../validation");
const http_1 = require("./http");
const failed = (messageAr, failureCode) => ({
    success: false,
    connectionStatus: "FAILED",
    messageAr,
    failureCode,
});
const connected = (messageAr) => ({
    success: true,
    connectionStatus: "CONNECTED",
    messageAr,
    failureCode: null,
});
function bearer(token) {
    return { Authorization: `Bearer ${token}`, accept: "application/json" };
}
function apiKey(key) {
    return { "api-key": key, accept: "application/json" };
}
function arrayFrom(value, key) {
    if (!value || typeof value !== "object")
        return [];
    const candidate = value[key];
    return Array.isArray(candidate) ? candidate : [];
}
function metaPath(path, appSecretProof) {
    if (!appSecretProof)
        return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}appsecret_proof=${encodeURIComponent(appSecretProof)}`;
}
function createAppSecretProof(accessToken, appSecret) {
    return (0, node_crypto_1.createHmac)("sha256", appSecret).update(accessToken).digest("hex");
}
class MetaWhatsAppConnectionTester {
    fetchImpl;
    constructor(fetchImpl = fetch) {
        this.fetchImpl = fetchImpl;
    }
    async test(input) {
        const token = input.values.ACCESS_TOKEN;
        const appSecret = input.values.APP_SECRET;
        const verifyToken = input.values.WEBHOOK_VERIFY_TOKEN;
        const version = input.values.GRAPH_API_VERSION;
        const businessId = input.values.BUSINESS_ACCOUNT_ID;
        const phoneId = input.values.DEFAULT_PHONE_NUMBER_ID;
        if (!token || !appSecret || !verifyToken || !version || !businessId || !phoneId) {
            return failed("بيانات Meta المطلوبة غير مكتملة.", "META_CONFIGURATION_INCOMPLETE");
        }
        try {
            (0, validation_1.validateIntegrationSettingValue)("META_WHATSAPP", "WEBHOOK_VERIFY_TOKEN", verifyToken);
        }
        catch {
            return failed("رمز التحقق من Webhook غير صالح محليًا.", "META_WEBHOOK_VERIFY_TOKEN_INVALID");
        }
        const base = `https://graph.facebook.com/${version}`;
        try {
            const accountWithoutProof = await (0, http_1.providerFetch)(this.fetchImpl, `${base}/${businessId}?fields=id,name`, {
                method: "GET",
                headers: bearer(token),
            });
            if (!accountWithoutProof.ok) {
                return failed("تعذر الوصول إلى حساب أعمال Meta.", accountWithoutProof.status === 401 ? "META_UNAUTHORIZED" : "META_BUSINESS_ACCOUNT_UNAVAILABLE");
            }
            const appSecretProof = createAppSecretProof(token, appSecret);
            const accountWithProof = await (0, http_1.providerFetch)(this.fetchImpl, `${base}/${metaPath(`${businessId}?fields=id,name`, appSecretProof)}`, { method: "GET", headers: bearer(token) });
            if (!accountWithProof.ok) {
                return failed("تعذر التحقق من توافق App Secret مع Access Token.", "META_APP_SECRET_MISMATCH");
            }
            const phones = await (0, http_1.providerFetch)(this.fetchImpl, `${base}/${metaPath(`${businessId}/phone_numbers?fields=id,verified_name,display_phone_number`, appSecretProof)}`, { method: "GET", headers: bearer(token) });
            if (!phones.ok)
                return failed("تعذر قراءة أرقام واتساب المرتبطة بحساب الأعمال.", "META_PHONE_NUMBERS_UNAVAILABLE");
            const linked = arrayFrom(phones.body, "data").some((item) => !!item && typeof item === "object" && String(item.id ?? "") === phoneId);
            if (!linked)
                return failed("رقم واتساب المحدد غير مرتبط بحساب الأعمال.", "META_PHONE_NUMBER_MISMATCH");
            const phone = await (0, http_1.providerFetch)(this.fetchImpl, `${base}/${metaPath(`${phoneId}?fields=id,verified_name,display_phone_number,quality_rating`, appSecretProof)}`, { method: "GET", headers: bearer(token) });
            if (!phone.ok)
                return failed("تعذر الوصول إلى رقم واتساب المحدد.", "META_PHONE_NUMBER_UNAVAILABLE");
            return connected("تم التحقق من بيانات الوصول إلى Meta وتوافق App Secret وحساب واتساب ورقم الهاتف. رمز Webhook Verify Token موجود وصالح محليًا وجاهز لعملية التحقق من Webhook.");
        }
        catch {
            return failed("تعذر الاتصال بخدمة Meta حاليًا.", "META_REQUEST_FAILED");
        }
    }
}
exports.MetaWhatsAppConnectionTester = MetaWhatsAppConnectionTester;
/**
 * Elastic Email reports failures as `{"Error":"..."}` with an HTTP 400, so the message
 * string is the only signal available. Falls back to the raw text when the payload is
 * not JSON, so a proxy/HTML error page still contributes something to match on.
 */
function elasticEmailErrorText(res) {
    const body = res.body;
    if (body && typeof body === "object") {
        const row = body;
        const value = row.Error ?? row.error ?? row.message ?? row.Message;
        if (typeof value === "string")
            return value;
    }
    return res.text ?? "";
}
/**
 * `GET /v4/domains` does not always answer with a bare hostname. When a domain is verified for one
 * specific sender rather than wholesale, Elastic Email returns the sender scope inline:
 *
 *     "Domain": "gozbebekleri.org (info@gozbebekleri.org)"
 *
 * Comparing that string to "gozbebekleri.org" never matched, so a correctly verified sender was
 * reported as ELASTIC_EMAIL_SENDER_DOMAIN_NOT_VERIFIED on the فحص الاتصال page.
 */
function elasticEmailDomainName(raw) {
    return raw.split("(")[0].trim().toLowerCase();
}
/** Elastic Email (REST API v4) — the only email provider. Verifies the key without sending mail. */
class ElasticEmailConnectionTester {
    fetchImpl;
    constructor(fetchImpl = fetch) {
        this.fetchImpl = fetchImpl;
    }
    async test(input) {
        const key = input.values.API_KEY;
        const senderEmail = input.values.SENDER_EMAIL?.trim().toLowerCase();
        if (!key || !senderEmail)
            return failed("بيانات Elastic Email المطلوبة غير مكتملة.", "ELASTIC_EMAIL_CONFIGURATION_INCOMPLETE");
        try {
            (0, validation_1.validateIntegrationSettingValue)("ELASTIC_EMAIL", "SENDER_EMAIL", senderEmail);
        }
        catch {
            return failed("بريد المرسل غير صالح محليًا.", "ELASTIC_EMAIL_SENDER_INVALID");
        }
        const senderDomain = senderEmail.split("@")[1] ?? "";
        try {
            const domains = await (0, http_1.providerFetch)(this.fetchImpl, "https://api.elasticemail.com/v4/domains", {
                method: "GET",
                headers: { "X-ElasticEmail-ApiKey": key, accept: "application/json" },
            });
            // Elastic Email v4 answers BOTH "this key is invalid" and "this key may not use
            // this endpoint" with HTTP 400 — it never returns 401 — so the status code alone
            // cannot tell them apart. Only the body can:
            //     {"Error":"APIKey Expired"}   -> key is invalid, missing, or revoked
            //     {"Error":"Access Denied."}   -> key is valid but not scoped for this endpoint
            // Matching on 401/403 alone therefore collapsed a working send-only key into
            // ELASTIC_EMAIL_ACCOUNT_UNAVAILABLE and reported a healthy account as broken.
            const apiError = elasticEmailErrorText(domains).toLowerCase();
            const keyRejected = domains.status === 401 ||
                /apikey\s*(expired|invalid|not\s*found)|invalid\s*api\s*key|unauthorized/.test(apiError);
            if (keyRejected)
                return failed("مفتاح Elastic Email غير صالح أو انتهت صلاحيته.", "ELASTIC_EMAIL_UNAUTHORIZED");
            // A send-scoped key may not be allowed to list domains (400 "Access Denied", or 403 on
            // other plans) and older accounts may not expose the endpoint at all (404/405). The key
            // still works for sending, so treat those as "connected but domain unverified" instead
            // of a false failure.
            if (!domains.ok) {
                const scopeLimited = /access denied|not\s*authorized\s*to|permission/.test(apiError) ||
                    domains.status === 403 ||
                    domains.status === 404 ||
                    domains.status === 405;
                if (scopeLimited) {
                    return connected("تم قبول مفتاح Elastic Email. صلاحيات المفتاح لا تسمح بقراءة النطاقات، لذا لم يتم التحقق من توثيق نطاق المرسل تلقائيًا.");
                }
                return failed("تعذر الوصول إلى حساب Elastic Email.", "ELASTIC_EMAIL_ACCOUNT_UNAVAILABLE");
            }
            const rows = Array.isArray(domains.body) ? domains.body : arrayFrom(domains.body, "Data");
            const matched = rows.some((item) => {
                if (!item || typeof item !== "object")
                    return false;
                const row = item;
                const name = row.Domain ?? row.domain;
                if (typeof name !== "string")
                    return false;
                return elasticEmailDomainName(name) === senderDomain;
            });
            if (!matched)
                return failed("نطاق بريد المرسل غير موجود ضمن نطاقات Elastic Email الموثّقة.", "ELASTIC_EMAIL_SENDER_DOMAIN_NOT_VERIFIED");
            return connected("تم التحقق من مفتاح Elastic Email ومن توثيق نطاق بريد المرسل دون إرسال أي رسالة.");
        }
        catch {
            return failed("تعذر الاتصال بخدمة Elastic Email حاليًا.", "ELASTIC_EMAIL_REQUEST_FAILED");
        }
    }
}
exports.ElasticEmailConnectionTester = ElasticEmailConnectionTester;
/** Brevo — international (non-Turkish) SMS only. Email moved to Elastic Email. */
class BrevoConnectionTester {
    fetchImpl;
    constructor(fetchImpl = fetch) {
        this.fetchImpl = fetchImpl;
    }
    async test(input) {
        const key = input.values.API_KEY;
        const smsSender = input.values.SMS_SENDER;
        if (!key || !smsSender)
            return failed("بيانات Brevo المطلوبة غير مكتملة.", "BREVO_CONFIGURATION_INCOMPLETE");
        try {
            (0, validation_1.validateIntegrationSettingValue)("BREVO", "SMS_SENDER", smsSender);
        }
        catch {
            return failed("اسم مرسل SMS غير صالح محليًا.", "BREVO_SMS_SENDER_INVALID");
        }
        try {
            const account = await (0, http_1.providerFetch)(this.fetchImpl, "https://api.brevo.com/v3/account", {
                method: "GET",
                headers: apiKey(key),
            });
            if (!account.ok)
                return failed("تعذر الوصول إلى حساب Brevo.", account.status === 401 ? "BREVO_UNAUTHORIZED" : "BREVO_ACCOUNT_UNAVAILABLE");
            return connected("تم التحقق من حساب Brevo ومن إعداد مرسل SMS الدولي دون إرسال رسالة.");
        }
        catch {
            return failed("تعذر الاتصال بخدمة Brevo حاليًا.", "BREVO_REQUEST_FAILED");
        }
    }
}
exports.BrevoConnectionTester = BrevoConnectionTester;
class NetgsmConnectionTester {
    fetchImpl;
    constructor(fetchImpl = fetch) {
        this.fetchImpl = fetchImpl;
    }
    async test(input) {
        const usercode = input.values.USERCODE;
        const password = input.values.PASSWORD;
        const header = input.values.HEADER;
        if (!usercode || !password || !header)
            return failed("بيانات Netgsm المطلوبة غير مكتملة.", "NETGSM_CONFIGURATION_INCOMPLETE");
        const authorization = `Basic ${Buffer.from(`${usercode}:${password}`).toString("base64")}`;
        try {
            const account = await (0, http_1.providerFetch)(this.fetchImpl, "https://api.netgsm.com.tr/balance/list/get", {
                method: "GET",
                headers: { Authorization: authorization, accept: "application/json,text/plain" },
            });
            if (!account.ok)
                return failed("تعذر التحقق من حساب Netgsm.", account.status === 401 ? "NETGSM_UNAUTHORIZED" : "NETGSM_ACCOUNT_UNAVAILABLE");
            const normalized = account.text.trim();
            if (/^(30|40|50|60|70)\b/.test(normalized))
                return failed("بيانات دخول Netgsm غير مقبولة.", "NETGSM_AUTH_REJECTED");
            const headers = await (0, http_1.providerFetch)(this.fetchImpl, "https://api.netgsm.com.tr/sms/rest/v2/header", {
                method: "GET",
                headers: { Authorization: authorization, accept: "application/json,text/plain" },
            });
            if (headers.ok) {
                const haystack = JSON.stringify(headers.body ?? headers.text).toLocaleUpperCase("tr-TR");
                if (!haystack.includes(header.toLocaleUpperCase("tr-TR"))) {
                    return failed("اسم المرسل غير موجود ضمن عناوين Netgsm المتاحة.", "NETGSM_HEADER_NOT_AVAILABLE");
                }
            }
            else if (headers.status !== 404 && headers.status !== 405) {
                return failed("تعذر التحقق من اسم المرسل في Netgsm.", "NETGSM_HEADER_CHECK_FAILED");
            }
            return connected("تم التحقق من حساب Netgsm واسم المرسل دون إرسال رسالة.");
        }
        catch {
            return failed("تعذر الاتصال بخدمة Netgsm حاليًا.", "NETGSM_REQUEST_FAILED");
        }
    }
}
exports.NetgsmConnectionTester = NetgsmConnectionTester;
class SystemCronConnectionTester {
    async test(input) {
        const secret = input.values.CRON_SECRET;
        if (!secret)
            return failed("مفتاح الجدولة غير متوفر.", "CRON_SECRET_MISSING");
        if (secret.length < 32 || /[\r\n]/.test(secret))
            return failed("مفتاح الجدولة لا يحقق متطلبات الأمان.", "CRON_SECRET_INVALID");
        return connected("تم التحقق من إمكانية قراءة مفتاح الجدولة وتوافقه مع حماية Bearer الحالية.");
    }
}
exports.SystemCronConnectionTester = SystemCronConnectionTester;
class IntegrationProviderTesterRegistry {
    testers;
    constructor(fetchImpl = fetch) {
        this.testers = {
            META_WHATSAPP: new MetaWhatsAppConnectionTester(fetchImpl),
            ELASTIC_EMAIL: new ElasticEmailConnectionTester(fetchImpl),
            BREVO: new BrevoConnectionTester(fetchImpl),
            NETGSM: new NetgsmConnectionTester(fetchImpl),
            SYSTEM: new SystemCronConnectionTester(),
        };
    }
    test(input) {
        return this.testers[input.provider].test(input);
    }
}
exports.IntegrationProviderTesterRegistry = IntegrationProviderTesterRegistry;
