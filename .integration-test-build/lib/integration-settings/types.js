"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationSettingsError = void 0;
class IntegrationSettingsError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "IntegrationSettingsError";
        this.code = code;
    }
}
exports.IntegrationSettingsError = IntegrationSettingsError;
