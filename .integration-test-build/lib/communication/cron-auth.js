"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCronAuthorizationValid = isCronAuthorizationValid;
exports.cronInfrastructureStatus = cronInfrastructureStatus;
const node_crypto_1 = require("node:crypto");
function isCronAuthorizationValid(authorization, env = process.env) {
    const secret = env.CRON_SECRET;
    if (!secret || !authorization)
        return false;
    const expected = Buffer.from(`Bearer ${secret}`, "utf8");
    const received = Buffer.from(authorization, "utf8");
    if (expected.length !== received.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(expected, received);
}
function cronInfrastructureStatus(env = process.env) {
    const secret = env.CRON_SECRET;
    return {
        secretConfigured: !!secret,
        secretValid: !!secret && secret.length >= 32 && !/[\r\n]/.test(secret),
        routeProtected: !!secret,
    };
}
