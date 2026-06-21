"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Languages,
  Loader2,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentLocalizationPreviewDialog } from "./ContentLocalizationPreviewDialog";

const LOCALE_LABELS: Record<string, string> = {
  en: "الإنجليزية",
  fr: "الفرنسية",
  tr: "التركية",
  id: "الإندونيسية",
  pt: "البرتغالية",
  es: "الإسبانية",
  de: "الألمانية",
};

const LOCALE_SHORT: Record<string, string> = {
  en: "EN",
  fr: "FR",
  tr: "TR",
  id: "ID",
  pt: "PT",
  es: "ES",
  de: "DE",
};

const FIELD_LABELS: Record<string, string> = {
  title: "العنوان",
  name: "الاسم",
  description: "الوصف",
  content: "المحتوى",
};

type Section = "campaigns" | "categories" | "blog";

type LocaleSummary = {
  incompleteItems: number;
  missingRecords: number;
  emptyFields: number;
  identicalToArabicFields: number;
};

type LocaleStatus = {
  exists: boolean;
  complete: boolean;
  missingFields: string[];
  emptyFields: string[];
  identicalToArabicFields: string[];
};

type AuditItem = {
  id: string;
  label: string;
  typeLabel: string;
  arabicQualityIssues: { field: string; rule: string; suggestion: string }[];
  localeStatus: Record<string, LocaleStatus>;
};

type AuditResponse = {
  ok: boolean;
  section: Section;
  targetLocales: string[];
  generatedAt: string;
  summary: {
    totalItems: number;
    arabicQualityIssues: number;
    byLocale: Record<string, LocaleSummary>;
  };
  items: AuditItem[];
};

type BulkProgress = {
  processed: number;
  total: number;
  errors: number;
};

const SECTION_LABELS: Record<Section, string> = {
  campaigns: "المشاريع",
  categories: "الحملات",
  blog: "المقالات",
};

function fieldNames(fields: string[]) {
  if (!fields.length) return "";
  return fields.map((field) => FIELD_LABELS[field] || field).join("، ");
}

function issueText(locale: string, status: LocaleStatus) {
  const reasons: string[] = [];
  if (!status.exists) reasons.push("الترجمة غير موجودة");
  if (status.emptyFields.length) reasons.push(`حقول فارغة: ${fieldNames(status.emptyFields)}`);
  if (status.missingFields.length) reasons.push(`حقول ناقصة: ${fieldNames(status.missingFields)}`);
  if (status.identicalToArabicFields.length) reasons.push(`منسوخ من العربي: ${fieldNames(status.identicalToArabicFields)}`);
  return `${LOCALE_LABELS[locale] || locale}: ${reasons.join("، ")}`;
}

function completionPercent(totalItems: number, incompleteItems?: number) {
  if (!totalItems) return 100;
  return Math.max(0, Math.round(((totalItems - (incompleteItems || 0)) / totalItems) * 100));
}

function qualityLabel(score: number) {
  if (score >= 95) return { label: "ممتاز", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (score >= 80) return { label: "جيد", tone: "border-blue-200 bg-blue-50 text-blue-700" };
  if (score >= 55) return { label: "يحتاج مراجعة", tone: "border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "يحتاج عمل", tone: "border-red-200 bg-red-50 text-red-700" };
}

export function ContentLocalizationAuditCard({ section }: { section: Section }) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<AuditResponse>("/api/admin/content-localization/audit", {
        params: { section, onlyIssues: true },
      });
      setData(response.data);
    } catch (err: any) {
      console.error("Content localization audit failed:", err);
      setError(err?.response?.data?.error || "تعذر فحص الترجمات الآن");
    } finally {
      setLoading(false);
    }
  };

  const runBulkArabicProofread = async () => {
    const confirmed = window.confirm(
      `سيتم تدقيق كل النصوص العربية في قسم ${SECTION_LABELS[section]} على دفعات آمنة.\n\nهذا سيعدل النصوص العربية الأصلية فقط ولن يلمس الأسعار أو الصور أو الروابط أو حالة النشر. هل تريد المتابعة؟`,
    );
    if (!confirmed) return;

    setBulkRunning(true);
    setBulkProgress({ processed: 0, total: data?.summary.totalItems || 0, errors: 0 });

    try {
      let offset = 0;
      let total = data?.summary.totalItems || 0;
      let errorsTotal = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await axios.post("/api/admin/content-localization/arabic-bulk-proofread", {
          section,
          offset,
          limit: 5,
        });

        total = response.data?.total ?? total;
        errorsTotal += Array.isArray(response.data?.errors) ? response.data.errors.length : 0;
        offset = response.data?.nextOffset ?? offset + 5;
        hasMore = Boolean(response.data?.hasMore);

        setBulkProgress({ processed: Math.min(offset, total), total, errors: errorsTotal });
      }

      if (errorsTotal) {
        setError(`اكتمل التدقيق العربي مع ${errorsTotal} أخطاء في بعض العناصر. راجع السجلات أو أعد المحاولة لاحقًا.`);
      } else {
        setError(null);
      }
      await loadAudit();
    } catch (err: any) {
      console.error("Bulk Arabic proofreading failed:", err);
      setError(err?.response?.data?.error || "تعذر تشغيل التدقيق العربي الشامل");
    } finally {
      setBulkRunning(false);
    }
  };

  useEffect(() => {
    loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const hasIssues = useMemo(() => {
    if (!data) return false;
    return data.summary.arabicQualityIssues > 0 || Object.values(data.summary.byLocale).some((x) => x.incompleteItems > 0);
  }, [data]);

  const totals = useMemo(() => {
    const totalItems = data?.summary.totalItems || 0;
    const localeSummaries = Object.values(data?.summary.byLocale || {});
    const incompleteItems = localeSummaries.reduce((sum, item) => sum + (item.incompleteItems || 0), 0);
    const missingRecords = localeSummaries.reduce((sum, item) => sum + (item.missingRecords || 0), 0);
    const emptyFields = localeSummaries.reduce((sum, item) => sum + (item.emptyFields || 0), 0);
    const copiedFields = localeSummaries.reduce((sum, item) => sum + (item.identicalToArabicFields || 0), 0);
    const arabicIssues = data?.summary.arabicQualityIssues || 0;
    const possibleIssues = Math.max(1, totalItems * Math.max(1, localeSummaries.length));
    const score = Math.max(0, Math.round(100 - Math.min(100, ((incompleteItems + arabicIssues) / possibleIssues) * 100)));
    return { totalItems, incompleteItems, missingRecords, emptyFields, copiedFields, arabicIssues, score };
  }, [data]);

  const german = data?.summary.byLocale.de;
  const topLocales = data?.targetLocales || [];
  const visibleItems = data?.items || [];
  const germanCompletion = completionPercent(data?.summary.totalItems || 0, german?.incompleteItems || 0);
  const bulkPercent = bulkProgress?.total ? Math.round((bulkProgress.processed / bulkProgress.total) * 100) : 0;
  const quality = qualityLabel(totals.score);

  return (
    <>
      <Card className="border-blue-100 bg-gradient-to-br from-white to-sky-50/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 text-[#025EB8]">
                <Languages className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">مراجعة النصوص والترجمات</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  فحص خفيف لقسم {SECTION_LABELS[section]} يكشف نقص الترجمات وملاحظات التدقيق بدون ازدحام.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data && (
                <span className={`rounded-full border px-3 py-1 text-sm font-bold ${quality.tone}`}>
                  {totals.score}/100 · {quality.label}
                </span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailsOpen((x) => !x)} className="gap-2">
                {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {detailsOpen ? "إخفاء اللوحة" : "فتح اللوحة"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {detailsOpen && (
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={loadAudit} disabled={loading || bulkRunning} className="gap-2 whitespace-nowrap">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                تحديث الفحص
              </Button>
              <Button variant="outline" size="sm" onClick={runBulkArabicProofread} disabled={bulkRunning} className="gap-2 whitespace-nowrap border-purple-300 text-purple-700 hover:bg-purple-50">
                {bulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                تدقيق العربي بالكامل
              </Button>
              <Button size="sm" onClick={() => setPreviewOpen(true)} className="gap-2 whitespace-nowrap bg-[#025EB8] hover:bg-[#014f9c]">
                <Sparkles className="h-4 w-4" />
                تجهيز الترجمات الناقصة
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {bulkProgress && bulkRunning && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تدقيق النصوص العربية في هذا القسم...
                </div>
                <div className="h-2 rounded-full bg-white/80">
                  <div className="h-2 rounded-full bg-purple-600 transition-all" style={{ width: `${bulkPercent}%` }} />
                </div>
                <div className="mt-2 text-xs">
                  تم فحص {bulkProgress.processed} من {bulkProgress.total} عنصر · أخطاء: {bulkProgress.errors}
                </div>
              </div>
            )}

            {!data && !error && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري فحص النصوص والترجمات...
              </div>
            )}

            {data && (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      اكتمال القسم
                    </div>
                    <div className="mt-2 text-2xl font-bold">{totals.totalItems}</div>
                    <p className="mt-1 text-xs text-muted-foreground">إجمالي العناصر التي يتم فحصها في هذا القسم.</p>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      عناصر تحتاج عملًا
                    </div>
                    <div className="mt-2 text-2xl font-bold text-amber-700">{totals.incompleteItems}</div>
                    <p className="mt-1 text-xs text-muted-foreground">يشمل الترجمات الناقصة أو الفارغة أو المنسوخة من العربي.</p>
                  </div>
                  <div className="rounded-xl border bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <SearchCheck className="h-4 w-4 text-blue-600" />
                      تدقيق العربية
                    </div>
                    <div className="mt-2 text-2xl font-bold text-purple-700">{totals.arabicIssues}</div>
                    <p className="mt-1 text-xs text-muted-foreground">ملاحظات على النص العربي الأصلي قبل الترجمة.</p>
                  </div>
                </div>

                <div className={`rounded-xl border p-3 ${hasIssues ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="flex items-start gap-2">
                    {hasIssues ? <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />}
                    <div className="text-sm">
                      <p className={hasIssues ? "font-medium text-amber-800" : "font-medium text-emerald-800"}>
                        {hasIssues ? "يوجد محتوى يحتاج ترجمة أو تدقيق" : "كل الترجمات في هذا القسم مكتملة حسب الفحص الحالي"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        استخدم زر الترجمة للمراجعة اليدوية، أو تدقيق العربي بالكامل عند الحاجة. لن يتم لمس الصور أو الأسعار أو الروابط.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <SearchCheck className="h-4 w-4 text-[#025EB8]" />
                      ملخص اللغات
                    </div>
                    <span className="text-xs text-muted-foreground">الألمانية: {germanCompletion}% مكتملة</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {topLocales.map((locale) => {
                      const item = data.summary.byLocale[locale];
                      const missing = item?.incompleteItems || 0;
                      const percent = completionPercent(data.summary.totalItems, missing);
                      const danger = locale === "de" && missing > 0;
                      return (
                        <div
                          key={locale}
                          className={`rounded-lg border p-2 ${
                            missing
                              ? danger
                                ? "border-red-200 bg-red-50"
                                : "border-amber-200 bg-amber-50"
                              : "border-emerald-200 bg-emerald-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold">{LOCALE_SHORT[locale] || locale}</span>
                            <span className={missing ? "text-xs font-bold text-red-700" : "text-xs font-bold text-emerald-700"}>
                              {missing ? `${missing} ناقص` : "مكتمل"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{LOCALE_LABELS[locale] || locale}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-white/80">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {data.items.length > 0 && (
                  <div className="rounded-xl border bg-white p-3">
                    <button type="button" onClick={() => setItemsOpen((x) => !x)} className="flex w-full items-center justify-between text-right">
                      <span className="text-sm font-semibold">العناصر التي تحتاج عملًا ({data.items.length})</span>
                      {itemsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {itemsOpen && (
                      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                        {visibleItems.map((item) => {
                          const badLocales = Object.entries(item.localeStatus).filter(([, status]) => !status.complete);
                          const firstGermanIssue = item.localeStatus.de && !item.localeStatus.de.complete ? issueText("de", item.localeStatus.de) : null;
                          return (
                            <div key={`${item.typeLabel}-${item.id}`} className="rounded-lg border bg-slate-50 p-3 text-sm">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">{item.typeLabel}</p>
                                </div>
                                <div className="flex flex-wrap gap-1 lg:justify-end">
                                  {badLocales.slice(0, 7).map(([locale, status]) => (
                                    <span
                                      key={locale}
                                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                        locale === "de" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"
                                      }`}
                                      title={issueText(locale, status)}
                                    >
                                      {LOCALE_SHORT[locale] || locale}: {!status.exists ? "غير موجود" : "غير مكتمل"}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {firstGermanIssue && (
                                <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                                  أولوية ألمانية: {firstGermanIssue}
                                </p>
                              )}

                              {badLocales.length > 0 && (
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                  {badLocales.slice(0, 3).map(([locale, status]) => (
                                    <div key={locale}>• {issueText(locale, status)}</div>
                                  ))}
                                  {badLocales.length > 3 && <div>• وهناك {badLocales.length - 3} لغة أخرى تحتاج مراجعة.</div>}
                                </div>
                              )}

                              {item.arabicQualityIssues.length > 0 && (
                                <p className="mt-2 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-700">
                                  تدقيق العربي: {item.arabicQualityIssues.map((x) => x.suggestion).join("، ")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
      <ContentLocalizationPreviewDialog
        section={section}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        defaultLocale="de"
        onSaved={loadAudit}
      />
    </>
  );
}
