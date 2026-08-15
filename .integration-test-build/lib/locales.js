"use strict";
/**
 * Single source of truth for locales across the app (i18n routing, middleware,
 * public pages, dashboard CRUD, messaging, audiences, templates).
 *
 * Two tiers:
 *  - ENABLED / PUBLIC locales (`SUPPORTED_LOCALES`) — fully translated, routed on
 *    the public site, valid for `User.preferredLang`. This is the exact set the
 *    public router and message loader use.
 *  - REGISTERED but disabled locales (`FUTURE_LOCALES`) — known to the
 *    messaging / audience / template layers so those systems are multilingual
 *    aware, but NOT publicly routed yet (no `messages/<code>.json`, so enabling
 *    them in the router would 500 / break the build). Flip `enabled: true` in
 *    `LOCALES` and add the message file + static import in `app/[locale]/layout.tsx`
 *    to promote one to public.
 *
 * To add a PUBLIC locale you still touch a few non-importable sources — the
 * canonical checklist lives in `docs/implementation-packages/locale-foundation.md`.
 * Everything that CAN import this module should, so the enabled set never drifts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCALE = exports.ALL_LOCALE_OPTIONS = exports.LOCALE_OPTIONS = exports.LOCALE_LABELS = exports.LOCALES = exports.ALL_LOCALES = exports.FUTURE_LOCALES = exports.SUPPORTED_LOCALES = void 0;
exports.isValidLocale = isValidLocale;
exports.isKnownLocale = isKnownLocale;
exports.localeDirection = localeDirection;
exports.localeMeta = localeMeta;
/** Enabled / public locales. Order is significant (drives dropdowns + routing). */
exports.SUPPORTED_LOCALES = [
    "ar",
    "en",
    "fr",
    "tr",
    "id",
    "pt",
    "es",
    "de",
];
/** Registered but not yet publicly routed. Target expansion set. */
exports.FUTURE_LOCALES = ["sq", "it", "nl", "sv"];
/** Every locale the platform knows about (enabled + future). */
exports.ALL_LOCALES = [...exports.SUPPORTED_LOCALES, ...exports.FUTURE_LOCALES];
/**
 * The catalog. `label` values for the 8 enabled locales are unchanged from the
 * previous `LOCALE_LABELS` so no existing UI copy shifts.
 */
exports.LOCALES = {
    ar: { code: "ar", label: "العربية", nativeLabel: "العربية", direction: "rtl", fallbackLocale: "ar", enabled: true },
    en: { code: "en", label: "English", nativeLabel: "English", direction: "ltr", fallbackLocale: "en", enabled: true },
    fr: { code: "fr", label: "Français", nativeLabel: "Français", direction: "ltr", fallbackLocale: "en", enabled: true },
    tr: { code: "tr", label: "Türkçe", nativeLabel: "Türkçe", direction: "ltr", fallbackLocale: "en", enabled: true },
    id: { code: "id", label: "Indonesia", nativeLabel: "Bahasa Indonesia", direction: "ltr", fallbackLocale: "en", enabled: true },
    pt: { code: "pt", label: "Português", nativeLabel: "Português", direction: "ltr", fallbackLocale: "en", enabled: true },
    es: { code: "es", label: "Español", nativeLabel: "Español", direction: "ltr", fallbackLocale: "en", enabled: true },
    de: { code: "de", label: "Deutsch", nativeLabel: "Deutsch", direction: "ltr", fallbackLocale: "en", enabled: true },
    // Registered, not yet publicly routed:
    sq: { code: "sq", label: "Albanian", nativeLabel: "Shqip", direction: "ltr", fallbackLocale: "en", enabled: false },
    it: { code: "it", label: "Italian", nativeLabel: "Italiano", direction: "ltr", fallbackLocale: "en", enabled: false },
    nl: { code: "nl", label: "Dutch", nativeLabel: "Nederlands", direction: "ltr", fallbackLocale: "en", enabled: false },
    sv: { code: "sv", label: "Swedish", nativeLabel: "Svenska", direction: "ltr", fallbackLocale: "en", enabled: false },
};
/** Historical export — label map for the enabled locales. Unchanged values. */
exports.LOCALE_LABELS = exports.SUPPORTED_LOCALES.reduce((acc, code) => {
    acc[code] = exports.LOCALES[code].label;
    return acc;
}, {});
/** Enabled locales for dropdown/select (code + label). */
exports.LOCALE_OPTIONS = exports.SUPPORTED_LOCALES.map((code) => ({
    code,
    label: exports.LOCALE_LABELS[code],
}));
/** Every registered locale for admin/messaging pickers (code + label + enabled). */
exports.ALL_LOCALE_OPTIONS = exports.ALL_LOCALES.map((code) => ({
    code,
    label: exports.LOCALES[code].label,
    nativeLabel: exports.LOCALES[code].nativeLabel,
    enabled: exports.LOCALES[code].enabled,
}));
exports.DEFAULT_LOCALE = "ar";
/** True for enabled / publicly-routed locales (unchanged historical semantics). */
function isValidLocale(value) {
    return exports.SUPPORTED_LOCALES.includes(value);
}
/** True for any registered locale, including future/disabled ones. */
function isKnownLocale(value) {
    return exports.ALL_LOCALES.includes(value);
}
/** Text direction for a locale. Unknown input defaults to `ltr`. */
function localeDirection(value) {
    return isKnownLocale(value) ? exports.LOCALES[value].direction : "ltr";
}
/** Metadata for a locale, or `undefined` if not registered. */
function localeMeta(value) {
    return isKnownLocale(value) ? exports.LOCALES[value] : undefined;
}
