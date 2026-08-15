"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignCreateValidationError = exports.CAMPAIGN_TRANSLATION_LOCALES = void 0;
exports.parseCampaignCreatePayload = parseCampaignCreatePayload;
exports.createCampaignCreator = createCampaignCreator;
const locales_1 = require("../locales");
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
exports.CAMPAIGN_TRANSLATION_LOCALES = locales_1.SUPPORTED_LOCALES.filter((locale) => locale !== "ar");
class CampaignCreateValidationError extends Error {
    field;
    status = 400;
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = "CampaignCreateValidationError";
    }
}
exports.CampaignCreateValidationError = CampaignCreateValidationError;
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requiredTrimmedString(value, field, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new CampaignCreateValidationError(`${label} is required`, field);
    }
    return value.trim();
}
function hasMeaningfulEditorContent(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return false;
    if (!trimmed.startsWith("{"))
        return true;
    try {
        const parsed = JSON.parse(trimmed);
        const stack = [parsed];
        while (stack.length) {
            const current = stack.pop();
            if (!current || typeof current !== "object")
                continue;
            if (Array.isArray(current)) {
                stack.push(...current);
                continue;
            }
            const record = current;
            if (typeof record.text === "string" && record.text.trim())
                return true;
            for (const child of Object.values(record))
                stack.push(child);
        }
        return false;
    }
    catch {
        return true;
    }
}
function requiredDescription(value, field, label) {
    const description = requiredTrimmedString(value, field, label);
    if (!hasMeaningfulEditorContent(description)) {
        throw new CampaignCreateValidationError(`${label} is required`, field);
    }
    return description;
}
function finiteNumber(value, field, options = {}) {
    if (value === undefined && options.defaultValue !== undefined) {
        return options.defaultValue;
    }
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
        throw new CampaignCreateValidationError(`${field} must be a valid number`, field);
    }
    if (options.min !== undefined && numberValue < options.min) {
        throw new CampaignCreateValidationError(`${field} must be at least ${options.min}`, field);
    }
    if (options.integer && !Number.isInteger(numberValue)) {
        throw new CampaignCreateValidationError(`${field} must be an integer`, field);
    }
    return numberValue;
}
function optionalLink(value, field) {
    if (value === undefined || value === null || value === "")
        return null;
    if (typeof value !== "string") {
        throw new CampaignCreateValidationError(`${field} must be a valid URL`, field);
    }
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if (trimmed.startsWith("/"))
        return trimmed;
    try {
        const parsed = new URL(trimmed);
        if (!ALLOWED_PROTOCOLS.has(parsed.protocol))
            throw new Error("protocol");
        return trimmed;
    }
    catch {
        throw new CampaignCreateValidationError(`${field} must be a valid URL`, field);
    }
}
function imageList(value) {
    if (!Array.isArray(value)) {
        throw new CampaignCreateValidationError("images must be an array", "images");
    }
    const images = value.map((item, index) => {
        const normalized = optionalLink(item, `images.${index}`);
        if (!normalized) {
            throw new CampaignCreateValidationError(`images.${index} must be a valid URL`, `images.${index}`);
        }
        return normalized;
    });
    if (!images.length) {
        throw new CampaignCreateValidationError("At least one campaign image is required", "images");
    }
    return images;
}
function categoryIdsFromBody(body) {
    const rawIds = Array.isArray(body.categoryIds)
        ? body.categoryIds
        : body.categoryId === undefined
            ? []
            : [body.categoryId];
    if (!rawIds.length) {
        throw new CampaignCreateValidationError("At least one categoryId is required", "categoryIds");
    }
    const invalid = rawIds.filter((value) => typeof value !== "string" || !OBJECT_ID_RE.test(value));
    if (invalid.length) {
        throw new CampaignCreateValidationError(`Invalid categoryId format: ${invalid.map(String).join(", ")}`, "categoryIds");
    }
    return [...new Set(rawIds)];
}
function translationsFromBody(body) {
    if (body.translations === undefined || body.translations === null)
        return [];
    if (!isRecord(body.translations)) {
        throw new CampaignCreateValidationError("translations must be an object", "translations");
    }
    const allowed = new Set(exports.CAMPAIGN_TRANSLATION_LOCALES);
    const translations = [];
    for (const [locale, rawTranslation] of Object.entries(body.translations)) {
        if (!allowed.has(locale)) {
            throw new CampaignCreateValidationError(`Unsupported translation locale: ${locale}`, `translations.${locale}`);
        }
        if (!isRecord(rawTranslation)) {
            throw new CampaignCreateValidationError(`translations.${locale} must be an object`, `translations.${locale}`);
        }
        const rawTitle = rawTranslation.title;
        const rawDescription = rawTranslation.description;
        const image = optionalLink(rawTranslation.image, `translations.${locale}.image`);
        const videoUrl = optionalLink(rawTranslation.videoUrl, `translations.${locale}.videoUrl`);
        const hasTitle = typeof rawTitle === "string" && Boolean(rawTitle.trim());
        const hasDescription = typeof rawDescription === "string" &&
            hasMeaningfulEditorContent(rawDescription);
        const hasAnyValue = hasTitle || hasDescription || Boolean(image) || Boolean(videoUrl);
        if (!hasAnyValue)
            continue;
        if (!hasTitle || !hasDescription) {
            throw new CampaignCreateValidationError(`translations.${locale} requires both title and description`, `translations.${locale}`);
        }
        const title = requiredTrimmedString(rawTitle, `translations.${locale}.title`, `translations.${locale}.title`);
        const description = requiredDescription(rawDescription, `translations.${locale}.description`, `translations.${locale}.description`);
        const explicitSlug = typeof rawTranslation.slug === "string" && rawTranslation.slug.trim()
            ? rawTranslation.slug.trim()
            : null;
        translations.push({
            locale: locale,
            title,
            description,
            image,
            videoUrl,
            slugBase: explicitSlug || title,
        });
    }
    return translations;
}
function parseCampaignCreatePayload(rawBody, extras) {
    if (!isRecord(rawBody)) {
        throw new CampaignCreateValidationError("Request body must be an object");
    }
    const title = requiredTrimmedString(rawBody.title, "title", "Arabic title");
    const description = requiredDescription(rawBody.description, "description", "Arabic description");
    const goalType = rawBody.goalType === undefined ? "FIXED" : rawBody.goalType;
    if (goalType !== "FIXED" && goalType !== "OPEN") {
        throw new CampaignCreateValidationError("Invalid goalType", "goalType");
    }
    const fundraisingMode = rawBody.fundraisingMode === undefined ? "AMOUNT" : rawBody.fundraisingMode;
    if (fundraisingMode !== "AMOUNT" && fundraisingMode !== "SHARES") {
        throw new CampaignCreateValidationError("Invalid fundraisingMode", "fundraisingMode");
    }
    const targetAmount = goalType === "OPEN"
        ? 0
        : finiteNumber(rawBody.targetAmount, "targetAmount", { min: 1 });
    const currentAmount = finiteNumber(rawBody.currentAmount, "currentAmount", {
        defaultValue: 0,
        min: 0,
    });
    const sharePriceUSD = fundraisingMode === "SHARES"
        ? finiteNumber(rawBody.sharePriceUSD, "sharePriceUSD", { min: 0.01 })
        : null;
    let priority = null;
    if (rawBody.priority !== undefined && rawBody.priority !== null && rawBody.priority !== "") {
        priority = finiteNumber(rawBody.priority, "priority", {
            min: 0,
            integer: true,
        });
    }
    if (rawBody.isActive !== undefined && typeof rawBody.isActive !== "boolean") {
        throw new CampaignCreateValidationError("isActive must be a boolean", "isActive");
    }
    const explicitSlug = typeof rawBody.slug === "string" && rawBody.slug.trim()
        ? rawBody.slug.trim()
        : null;
    return {
        title,
        description,
        targetAmount,
        currentAmount,
        images: imageList(rawBody.images),
        videoUrl: optionalLink(rawBody.videoUrl, "videoUrl"),
        isActive: rawBody.isActive ?? true,
        priority,
        goalType,
        fundraisingMode,
        sharePriceUSD,
        categoryIds: categoryIdsFromBody(rawBody),
        slugBase: explicitSlug || title,
        translations: translationsFromBody(rawBody),
        ...extras,
    };
}
function createCampaignCreator(dependencies) {
    return async function createCampaign(input) {
        return dependencies.transaction(async (tx) => {
            const categories = await tx.findCategories(input.categoryIds);
            const foundIds = new Set(categories.map((category) => category.id));
            const missingIds = input.categoryIds.filter((id) => !foundIds.has(id));
            if (missingIds.length) {
                throw new CampaignCreateValidationError(`Invalid categoryId(s): ${missingIds.join(", ")}`, "categoryIds");
            }
            const inactiveIds = categories
                .filter((category) => category.isActive === false)
                .map((category) => category.id);
            if (inactiveIds.length) {
                throw new CampaignCreateValidationError(`Inactive categoryId(s): ${inactiveIds.join(", ")}`, "categoryIds");
            }
            const slug = await tx.generateCampaignSlug(input.slugBase);
            if (!slug.trim()) {
                throw new CampaignCreateValidationError("Unable to generate a campaign slug", "slug");
            }
            const campaign = await tx.createCampaign({
                title: input.title,
                description: input.description,
                targetAmount: input.targetAmount,
                currentAmount: input.currentAmount,
                images: input.images,
                videoUrl: input.videoUrl,
                isActive: input.isActive,
                priority: input.priority,
                categoryIds: input.categoryIds,
                categoryPriorities: input.categoryPriorities,
                suggestedDonations: input.suggestedDonations,
                suggestedTeamSupport: input.suggestedTeamSupport,
                goalType: input.goalType,
                fundraisingMode: input.fundraisingMode,
                sharePriceUSD: input.sharePriceUSD,
                suggestedShareCounts: input.suggestedShareCounts,
                shareLabels: input.shareLabels,
                slug,
            });
            for (const translation of input.translations) {
                const translationSlug = await tx.generateTranslationSlug(translation.locale, translation.slugBase);
                await tx.createTranslation({
                    campaignId: campaign.id,
                    locale: translation.locale,
                    title: translation.title,
                    description: translation.description,
                    image: translation.image,
                    videoUrl: translation.videoUrl,
                    slug: translationSlug,
                });
            }
            return tx.getCreatedCampaign(campaign.id);
        });
    };
}
