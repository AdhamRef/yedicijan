"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCanonicalApplicationUrl = getCanonicalApplicationUrl;
function getCanonicalApplicationUrl(env = process.env) {
    const raw = env.APP_URL || env.NEXTAUTH_URL || env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL;
    if (!raw)
        throw new Error("CANONICAL_URL_MISSING");
    const url = new URL(raw);
    return url.origin;
}
