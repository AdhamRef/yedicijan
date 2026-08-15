"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTENT_LOCALIZATION_SECTIONS = void 0;
exports.parseContentLocalizationSection = parseContentLocalizationSection;
exports.contentLocalizationPermissionForSection = contentLocalizationPermissionForSection;
exports.CONTENT_LOCALIZATION_SECTIONS = [
    "campaigns",
    "categories",
    "blog",
];
const SECTION_PERMISSION = {
    campaigns: "campaigns",
    categories: "categories",
    blog: "blog",
};
function parseContentLocalizationSection(value) {
    return typeof value === "string" &&
        exports.CONTENT_LOCALIZATION_SECTIONS.includes(value)
        ? value
        : null;
}
function contentLocalizationPermissionForSection(section) {
    return SECTION_PERMISSION[section];
}
