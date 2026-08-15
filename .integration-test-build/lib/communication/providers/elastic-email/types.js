"use strict";
/** Shared types for the Elastic Email transactional adapter. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSenderIdentity = formatSenderIdentity;
/**
 * Build the RFC-5322 `From` header Elastic Email expects: `Name <email>` when a display name is
 * present, otherwise the bare address. Quotes names containing characters that would break the
 * header so the address itself is never corrupted.
 */
function formatSenderIdentity(email, name) {
    const address = email.trim();
    const display = (name ?? "").trim();
    if (!display)
        return address;
    const needsQuoting = /[",<>@;:\\]/.test(display);
    const safe = display.replace(/[\r\n]/g, " ");
    return needsQuoting ? `"${safe.replace(/(["\\])/g, "\\$1")}" <${address}>` : `${safe} <${address}>`;
}
