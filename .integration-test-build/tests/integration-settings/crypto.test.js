"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const crypto_1 = require("../../lib/integration-settings/crypto");
const KEY = Buffer.alloc(32, 7).toString("base64");
(0, node_test_1.default)("AES-256-GCM uses unique IVs and authenticates values", () => {
    const first = (0, crypto_1.encryptIntegrationSecret)("secret-value", "META_WHATSAPP:ACCESS_TOKEN", KEY);
    const second = (0, crypto_1.encryptIntegrationSecret)("secret-value", "META_WHATSAPP:ACCESS_TOKEN", KEY);
    strict_1.default.notEqual(first, second);
    strict_1.default.equal((0, crypto_1.decryptIntegrationSecret)(first, "META_WHATSAPP:ACCESS_TOKEN", KEY), "secret-value");
});
(0, node_test_1.default)("tampered ciphertext and incorrect field context fail closed", () => {
    const encrypted = (0, crypto_1.encryptIntegrationSecret)("secret-value", "META_WHATSAPP:ACCESS_TOKEN", KEY);
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
    strict_1.default.throws(() => (0, crypto_1.decryptIntegrationSecret)(tampered, "META_WHATSAPP:ACCESS_TOKEN", KEY), (error) => error instanceof crypto_1.IntegrationEncryptionError && error.code === "DECRYPTION_FAILED");
    strict_1.default.throws(() => (0, crypto_1.decryptIntegrationSecret)(encrypted, "META_WHATSAPP:APP_SECRET", KEY), (error) => error instanceof crypto_1.IntegrationEncryptionError && error.code === "DECRYPTION_FAILED");
});
(0, node_test_1.default)("missing and invalid keys are rejected", () => {
    const originalKey = process.env.INTEGRATION_SETTINGS_ENCRYPTION_KEY;
    try {
        delete process.env.INTEGRATION_SETTINGS_ENCRYPTION_KEY;
        strict_1.default.throws(() => (0, crypto_1.encryptIntegrationSecret)("secret", "SYSTEM:CRON_SECRET"), (error) => error instanceof crypto_1.IntegrationEncryptionError && error.code === "ENCRYPTION_KEY_MISSING");
    }
    finally {
        if (originalKey === undefined) {
            delete process.env.INTEGRATION_SETTINGS_ENCRYPTION_KEY;
        }
        else {
            process.env.INTEGRATION_SETTINGS_ENCRYPTION_KEY = originalKey;
        }
    }
    strict_1.default.throws(() => (0, crypto_1.encryptIntegrationSecret)("secret", "SYSTEM:CRON_SECRET", "not-a-key"), (error) => error instanceof crypto_1.IntegrationEncryptionError && error.code === "ENCRYPTION_KEY_INVALID");
});
(0, node_test_1.default)("masking never returns the original value", () => {
    strict_1.default.equal((0, crypto_1.maskIntegrationValue)("abcdefghA92F"), "••••••••A92F");
    strict_1.default.equal((0, crypto_1.maskIntegrationValue)("abc"), "••••••••");
    strict_1.default.equal((0, crypto_1.maskIntegrationValue)(null), null);
});
