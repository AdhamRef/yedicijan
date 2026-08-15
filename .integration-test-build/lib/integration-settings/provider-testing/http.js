"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerFetch = providerFetch;
async function providerFetch(fetchImpl, url, init, timeoutMs = 15_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(url, {
            ...init,
            signal: controller.signal,
        });
        const text = await response.text().catch(() => "");
        let body = null;
        if (text) {
            try {
                body = JSON.parse(text);
            }
            catch {
                body = null;
            }
        }
        return { ok: response.ok, status: response.status, body, text };
    }
    finally {
        clearTimeout(timer);
    }
}
