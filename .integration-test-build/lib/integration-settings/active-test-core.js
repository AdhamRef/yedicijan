"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCronInfrastructure = evaluateCronInfrastructure;
exports.runActiveProviderTest = runActiveProviderTest;
const catalog_1 = require("./catalog");
function evaluateCronInfrastructure(env) {
    const secret = env.CRON_SECRET;
    if (!secret)
        return { success: false, connectionStatus: "NOT_CONFIGURED", messageAr: "مفتاح Cron غير مضبوط في إعدادات السيرفر.", failureCode: "CRON_SECRET_MISSING" };
    if (secret.length < 32 || /[\r\n]/.test(secret))
        return { success: false, connectionStatus: "FAILED", messageAr: "مفتاح Cron لا يحقق متطلبات الأمان.", failureCode: "CRON_SECRET_INVALID" };
    return { success: true, connectionStatus: "CONNECTED", messageAr: "حماية Route الجدولة مضبوطة داخل البنية التحتية، ولم يتم تشغيل أي حملة.", failureCode: null };
}
async function runActiveProviderTest(provider, actor, dependencies) {
    const testedAt = (dependencies.now ?? (() => new Date()))();
    let result;
    let missingRequiredFields = [];
    if (provider === "SYSTEM") {
        result = evaluateCronInfrastructure(dependencies.env ?? process.env);
    }
    else {
        const values = await dependencies.resolveActiveValues(provider, actor);
        missingRequiredFields = (0, catalog_1.getProviderDefinition)(provider).fields
            .filter((field) => field.required && !values[field.key])
            .map((field) => field.key);
        if (missingRequiredFields.length) {
            result = { success: false, connectionStatus: "NOT_CONFIGURED", messageAr: "بيانات التكوين العامل المطلوبة غير مكتملة.", failureCode: "MISSING_REQUIRED_FIELDS" };
        }
        else {
            try {
                result = await dependencies.tester.test({ provider, values, candidateVersion: null });
            }
            catch {
                result = { success: false, connectionStatus: "FAILED", messageAr: "تعذر تنفيذ فحص الإعدادات الحالية.", failureCode: "PROVIDER_TEST_REQUEST_FAILED" };
            }
        }
    }
    await dependencies.record(provider, testedAt, result, actor.actorId);
    return { ...result, provider, testedAt: testedAt.toISOString(), candidateVersion: null, missingRequiredFields };
}
