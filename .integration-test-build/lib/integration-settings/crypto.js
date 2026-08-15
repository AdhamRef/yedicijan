"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationEncryptionError = void 0;
exports.encryptIntegrationSecret = encryptIntegrationSecret;
exports.decryptIntegrationSecret = decryptIntegrationSecret;
exports.integrationEncryptionKeyIsConfigured = integrationEncryptionKeyIsConfigured;
exports.maskIntegrationValue = maskIntegrationValue;
exports.integrationSecretContext = integrationSecretContext;
const node_crypto_1 = require("node:crypto");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ENVELOPE_VERSION = "v1";
const KEY_ENV_NAME = "INTEGRATION_SETTINGS_ENCRYPTION_KEY";
class IntegrationEncryptionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "IntegrationEncryptionError";
        this.code = code;
    }
}
exports.IntegrationEncryptionError = IntegrationEncryptionError;
function decodeEncryptionKey(raw) {
    const value = raw?.trim();
    if (!value) {
        throw new IntegrationEncryptionError("ENCRYPTION_KEY_MISSING", `${KEY_ENV_NAME} is required for secret integration settings`);
    }
    const candidates = [];
    if (/^[a-fA-F0-9]{64}$/.test(value)) {
        candidates.push(Buffer.from(value, "hex"));
    }
    try {
        candidates.push(Buffer.from(value, "base64url"));
    }
    catch {
        // The generic invalid-key error below is intentionally value-free.
    }
    try {
        candidates.push(Buffer.from(value, "base64"));
    }
    catch {
        // The generic invalid-key error below is intentionally value-free.
    }
    const key = candidates.find((candidate) => candidate.length === 32);
    if (!key) {
        throw new IntegrationEncryptionError("ENCRYPTION_KEY_INVALID", `${KEY_ENV_NAME} must decode to exactly 32 bytes`);
    }
    return key;
}
function encodePart(value) {
    return value.toString("base64url");
}
function decodePart(value) {
    try {
        return Buffer.from(value, "base64url");
    }
    catch {
        throw new IntegrationEncryptionError("ENCRYPTED_VALUE_INVALID", "Encrypted integration setting has an invalid envelope");
    }
}
function associatedData(context) {
    return Buffer.from(`gozbebekleri:integration-setting:${ENVELOPE_VERSION}:${context}`, "utf8");
}
function encryptIntegrationSecret(plaintext, context, rawKey = process.env[KEY_ENV_NAME]) {
    const key = decodeEncryptionKey(rawKey);
    const iv = (0, node_crypto_1.randomBytes)(IV_LENGTH_BYTES);
    const cipher = (0, node_crypto_1.createCipheriv)(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
    });
    cipher.setAAD(associatedData(context));
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
        ENVELOPE_VERSION,
        encodePart(iv),
        encodePart(authTag),
        encodePart(encrypted),
    ].join(".");
}
function decryptIntegrationSecret(envelope, context, rawKey = process.env[KEY_ENV_NAME]) {
    const key = decodeEncryptionKey(rawKey);
    const [version, ivPart, authTagPart, encryptedPart, extra] = envelope.split(".");
    if (version !== ENVELOPE_VERSION ||
        !ivPart ||
        !authTagPart ||
        !encryptedPart ||
        extra) {
        throw new IntegrationEncryptionError("ENCRYPTED_VALUE_INVALID", "Encrypted integration setting has an unsupported envelope");
    }
    const iv = decodePart(ivPart);
    const authTag = decodePart(authTagPart);
    const encrypted = decodePart(encryptedPart);
    if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES) {
        throw new IntegrationEncryptionError("ENCRYPTED_VALUE_INVALID", "Encrypted integration setting has invalid cryptographic parameters");
    }
    try {
        const decipher = (0, node_crypto_1.createDecipheriv)(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH_BYTES,
        });
        decipher.setAAD(associatedData(context));
        decipher.setAuthTag(authTag);
        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]).toString("utf8");
    }
    catch {
        throw new IntegrationEncryptionError("DECRYPTION_FAILED", "Unable to decrypt integration setting");
    }
}
function integrationEncryptionKeyIsConfigured(rawKey = process.env[KEY_ENV_NAME]) {
    try {
        decodeEncryptionKey(rawKey);
        return true;
    }
    catch {
        return false;
    }
}
function maskIntegrationValue(value) {
    if (!value)
        return null;
    const suffix = value.length >= 4 ? value.slice(-4) : "";
    return suffix ? `••••••••${suffix}` : "••••••••";
}
function integrationSecretContext(provider, key) {
    return `${provider}:${key}`;
}
