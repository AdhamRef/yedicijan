"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle2, Loader2, Save, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

const LOCALE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "الإنجليزية",
  fr: "الفرنسية",
  tr: "التركية",
  id: "الإندونيسية",
  pt: "البرتغالية",
  es: "الإسبانية",
  de: "الألمانية",
};

const LOCALE_NATIVE_NAMES: Record<string, string> = {
  ar: "العربية الفصحى",
  en: "English",
  fr: "Français",
  tr: "Türkçe",
  id: "Bahasa Indonesia",
  pt: "Português",
  es: "Español",
  de: "Deutsch",
};

const FIELD_LABELS: Record<string, string> = {
  title: "العنوان",
  name: "الاسم",
  description: "الوصف",
  content: "المحتوى",
};

const QUALITY_GUIDE: Record<string, string[]> = {
  ar: [
    "تدقيق الإملاء والهمزات: أ/إ/آ، ة/ه، ى/ي، علامات التنوين.",
    "مراجعة القواعد والتراكيب: التذكير والتأنيث، الإفراد والجمع، الربط بين الجمل.",
    "صياغة عربية فصحى طبيعية مناسبة للمحتوى الإنساني والتبرعات.",
    "الحفاظ على الأرقام، العملات، أسماء المناطق، أسماء المشاريع، والروابط كما هي.",
  ],
  de: [
    "صياغة ألمانية طبيعية وليست ترجمة حرفية من العربية.",
    "مراجعة الأدوات والحالات الإعرابية: der/die/das، Akkusativ، Dativ.",
    "استخدام مصطلحات إنسانية مناسبة مثل: Nothilfe، Spende، Bedürftige، Waisen، medizinische Versorgung.",
    "الحفاظ على أسماء المناطق والمشاريع والأرقام والعملات كما هي.",
  ],
  en: ["English donor-facing copy, clear and warm.", "No Arabic word order or literal phrasing.", "Preserve facts, numbers, URLs, and currencies."],
  fr: ["Français professionnel avec accents corrects.", "Ton humanitaire naturel, sans calque de l'arabe.", "Préserver les faits, montants et noms propres."],
  tr: ["Türkçe doğal ve dernek diline uygun olmalı.", "Bağış, yardım, ihtiyaç sahibi gibi terimler doğru kullanılmalı.", "Rakamlar ve özel isimler korunmalı."],
  id: ["Bahasa Indonesia yang jelas, hangat, dan profesional.", "Jangan menerjemahkan secara harfiah dari bahasa Arab.", "Pertahankan angka, nama, URL, dan mata uang."],
  pt: ["Português natural e profissional para captação de doações.", "Evitar tradução literal do árabe.", "Preservar fatos, valores, nomes e links."],
  es: ["Español natural y profesional para recaudación humanitaria.", "Evitar estructuras literales del árabe.", "Conservar cifras, nombres, URLs y monedas."],
};

type Section = "campaigns" | "categories" | "blog";

type PreviewRow = {
  id: string;
  type: "campaign" | "category" | "post" | "postCategory";
  label: string;
  typeLabel: string;
  locale: string;
  sourceArabic: Record<string, string | null>;
  currentTranslation: Record<string, string | null>;
  suggestedTranslation: Record<string, string>;
  missingFields: string[];
  emptyFields: string[];
  identicalToArabicFields: string[];
  qualityNotes?: string[];
};

function extractRichTextNode(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractRichTextNode).filter(Boolean).join("\n");
  if (typeof node !== "object") return "";

  const ownText = typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content) ? node.content.map(extractRichTextNode).filter(Boolean) : [];
  if (node.type === "hardBreak") return "\n";
  if (node.type === "paragraph" || node.type === "heading" || node.type === "listItem") {
    return [ownText, children.join("")].filter(Boolean).join("").trim();
  }
  return [ownText, children.join("\n")].filter(Boolean).join("\n").trim();
}

function displayText(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const extracted = extractRichTextNode(parsed).replace(/\n{3,}/g, "\n\n").trim();
      if (extracted) return extracted;
    } catch {
      // Fall through to normal cleanup.
    }
  }

  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function editableText(value: string | null | undefined) {
  return displayText(value);
}

function fieldList(row: PreviewRow) {
  return Object.keys(row.sourceArabic || {});
}

function containsArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function normalize(value: string | null | undefined) {
  return displayText(value).replace(/\s+/g, " ").trim();
}

function qualityIssues(value: string, locale: string, field: string) {
  const text = normalize(value);
  const issues: string[] = [];
  if (!text) {
    issues.push(locale === "ar" ? "الحقل العربي فارغ ويحتاج تعبئة." : "الحقل فارغ ولم تتم ترجمته بعد.");
    return issues;
  }

  if (locale === "ar") {
    if (!containsArabic(text)) issues.push("لا يظهر أن النص عربي، راجع هذا الحقل.");
    if (/\b(Project|Campaign|Donate|Donation|Payment|Receipt|Share|Shares|Blog|News|Category)\b/i.test(text)) issues.push("توجد كلمات إنجليزية داخل النص العربي.");
    if (/اخر|اخري|مسؤلية|مسؤوليه|تبرعكك|سهوم/g.test(text)) issues.push("قد توجد أخطاء إملائية عربية شائعة تحتاج مراجعة.");
    if ((field === "title" || field === "name") && text.length > 95) issues.push("العنوان طويل؛ يفضل اختصاره ليكون مناسبًا للبطاقات والصفحات.");
    if ((field === "description" || field === "content") && text.length < 30) issues.push("النص قصير جدًا وقد لا يشرح المشروع بشكل كافٍ.");
    if (/[!?]{2,}|\.\.\./.test(text)) issues.push("توجد علامات ترقيم مبالغ فيها.");
    return issues;
  }

  if (containsArabic(text)) issues.push("يوجد نص عربي داخل الترجمة.");
  if ((field === "title" || field === "name") && text.length > 95) issues.push("العنوان طويل؛ يفضل اختصاره ليكون مناسبًا للبطاقات والصفحات.");
  if ((field === "description" || field === "content") && text.length < 30) issues.push("النص قصير جدًا وقد لا يشرح المشروع بشكل كافٍ.");
  if (/[!?]{2,}|\.\.\./.test(text)) issues.push("توجد علامات ترقيم مبالغ فيها.");
  if (/\b(gaza|syria|turkey|orphan|donation)\b/.test(text) && locale !== "en") issues.push("راجع وجود كلمات إنجليزية داخل ترجمة غير إنجليزية.");
  if (locale === "de" && /\b(the|and|for|with|children|donation|campaign)\b/i.test(text)) issues.push("قد توجد كلمات إنجليزية داخل النص الألماني.");
  if (locale === "de" && text.length > 20 && !/[äöüßÄÖÜ]/.test(text) && /hilfe|spende|kind|familie/i.test(text)) {
    issues.push("راجع جودة الألمانية: قد تكون صحيحة، لكن تأكد من الصياغة الطبيعية والأحرف الألمانية عند الحاجة.");
  }
  return issues;
}

function rowQualityState(row: PreviewRow, locale: string) {
  const fields = fieldList(row);
  const issues = fields.flatMap((field) => qualityIssues(row.suggestedTranslation[field] || "", locale, field));
  return {
    issues,
    isReady: fields.every((field) => normalize(row.suggestedTranslation[field]).length > 0) && issues.filter((x) => x.includes("فارغ") || x.includes("عربي داخل الترجمة") || x.includes("لا يظهر أن النص عربي")).length === 0,
  };
}

export function ContentLocalizationPreviewDialog({
  section,
  open,
  onOpenChange,
  defaultLocale = "de",
  onSaved,
}: {
  section: Section;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocale?: string;
  onSaved?: () => void;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const isArabicMode = locale === "ar";

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/admin/content-localization/preview", {
        params: { section, locale, limit: 10 },
      });
      setRows(response.data.rows || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "تعذر تجهيز المعاينة");
    } finally {
      setLoading(false);
    }
  };

  const generateProfessionalTranslations = async () => {
    setGenerating(true);
    try {
      const response = await axios.post("/api/admin/content-localization/preview", {
        action: "generate",
        section,
        locale,
        limit: 8,
      });
      const generatedRows = response.data?.rows || [];
      setRows(generatedRows);
      if (generatedRows.length) {
        toast.success(isArabicMode ? `تم تدقيق ${generatedRows.length} نص عربي للمراجعة` : `تم توليد ${generatedRows.length} ترجمة احترافية للمراجعة`);
      } else {
        toast.success(isArabicMode ? "لا توجد نصوص عربية في هذه الدفعة" : "لا توجد عناصر ناقصة لهذه اللغة");
      }
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.error || "تعذر توليد الترجمات الاحترافية";
      if (String(message).includes("OPENAI_API_KEY")) {
        toast.error("يجب إضافة OPENAI_API_KEY في إعدادات البيئة لتفعيل التوليد الاحترافي");
      } else {
        toast.error(message);
      }
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (open) loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locale, section]);

  const changedRows = useMemo(() => {
    return rows
      .map((row) => ({
        id: row.id,
        type: row.type,
        fields: row.suggestedTranslation,
        sourceArabic: row.sourceArabic,
      }))
      .filter((row) => Object.values(row.fields || {}).some((value) => typeof value === "string" && displayText(value).trim()));
  }, [rows]);

  const readyRowsCount = useMemo(() => rows.filter((row) => rowQualityState(row, locale).isReady).length, [rows, locale]);

  const updateField = (rowIndex: number, field: string, value: string) => {
    setRows((prev) => prev.map((row, index) => {
      if (index !== rowIndex) return row;
      return {
        ...row,
        suggestedTranslation: {
          ...row.suggestedTranslation,
          [field]: value,
        },
      };
    }));
  };

  const saveRows = async () => {
    if (!changedRows.length) {
      toast.error(isArabicMode ? "لا توجد نصوص عربية جاهزة للحفظ" : "لا توجد ترجمة مكتوبة للحفظ");
      return;
    }
    const riskyRows = rows.filter((row) => {
      const state = rowQualityState(row, locale);
      return Object.values(row.suggestedTranslation || {}).some((value) => normalize(value).length > 0) && !state.isReady;
    });
    if (riskyRows.length > 0 && !window.confirm(`يوجد ${riskyRows.length} عنصر عليه ملاحظات لغوية. هل تريد الحفظ بعد مراجعتك؟`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post("/api/admin/content-localization/preview", {
        locale,
        rows: changedRows,
      });
      const saved = response.data?.saved || 0;
      const errors = response.data?.errors || [];
      if (saved) toast.success(isArabicMode ? `تم حفظ تدقيق ${saved} نص عربي` : `تم حفظ ${saved} عنصر`);
      if (errors.length) toast.error(`تعذر حفظ ${errors.length} عنصر`);
      await loadRows();
      onSaved?.();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || "تعذر حفظ الترجمات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#025EB8]" />
            {isArabicMode ? "تدقيق العربية لغويًا وإملائيًا" : "معاينة وتدقيق الترجمات الناقصة"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {isArabicMode
              ? "هذه الإدارة مخصصة لتدقيق النص العربي الأصلي قبل الاعتماد أو قبل استخدامه كمصدر للترجمة. يتم تصحيح الإملاء والقواعد والصياغة مع الحفاظ على المعنى والبيانات كما هي."
              : "هذه الإدارة مخصصة للترجمة الاحترافية والتدقيق اللغوي قبل الحفظ. يمكنك توليد ترجمة احترافية أولية، ثم مراجعتها يدويًا قبل اعتمادها نهائيًا."}
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              معيار اعتماد {LOCALE_LABELS[locale]}
            </div>
            <ul className="space-y-1 text-xs leading-5">
              {(QUALITY_GUIDE[locale] || QUALITY_GUIDE.en).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
          <div className="flex items-start gap-2">
            <WandSparkles className="mt-0.5 h-4 w-4" />
            <div>
              <div className="font-semibold">{isArabicMode ? "تدقيق عربي احترافي + مراجعة بشرية" : "توليد احترافي + مراجعة بشرية"}</div>
              <div className="mt-1 text-xs leading-5">
                {isArabicMode
                  ? "زر التدقيق يجهز نسخة عربية محسّنة لغويًا وإملائيًا، لكنه لا يحفظها تلقائيًا. يجب مراجعة النص ثم الضغط على “حفظ بعد التدقيق”."
                  : "زر التوليد يجهز ترجمة مصاغة بعناية حسب قواعد اللغة المستهدفة، لكنه لا يحفظها تلقائيًا. يجب مراجعة النص، ملاحظات الجودة، ثم الضغط على “حفظ بعد التدقيق”."}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{isArabicMode ? "وضع التدقيق" : "اللغة المستهدفة"}</span>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOCALE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label} · {LOCALE_NATIVE_NAMES[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rows.length > 0 && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                جاهز لغويًا: {readyRowsCount} / {rows.length}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadRows} disabled={loading || generating}>
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              تحديث المعاينة
            </Button>
            <Button variant="outline" onClick={generateProfessionalTranslations} disabled={loading || generating || saving} className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {isArabicMode ? "تدقيق عربي احترافي" : "توليد ترجمة احترافية"}
            </Button>
            <Button onClick={saveRows} disabled={saving || generating || !changedRows.length} className="gap-2 bg-[#025EB8] hover:bg-[#014f9c]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ بعد التدقيق ({changedRows.length})
            </Button>
          </div>
        </div>

        {loading || generating ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            {generating ? (isArabicMode ? "جاري تدقيق النصوص العربية احترافيًا..." : "جاري توليد ترجمة احترافية قابلة للمراجعة...") : "جاري تجهيز العناصر..."}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-emerald-50 p-6 text-center text-emerald-700">
            {isArabicMode ? "لا توجد نصوص عربية في هذه الدفعة." : "لا توجد عناصر ناقصة لهذه اللغة داخل هذا القسم."}
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, rowIndex) => {
              const state = rowQualityState(row, locale);
              return (
                <div key={`${row.type}-${row.id}`} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{row.label}</h3>
                      <p className="text-xs text-muted-foreground">{row.typeLabel} · {LOCALE_LABELS[locale]} · {LOCALE_NATIVE_NAMES[locale]}</p>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${state.isReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {state.isReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {state.isReady ? "جاهز لغويًا" : "يحتاج تدقيقًا"}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {row.missingFields.length ? `حقول ناقصة: ${row.missingFields.map((x) => FIELD_LABELS[x] || x).join("، ")}` : ""}
                        {row.emptyFields.length ? ` · حقول فارغة: ${row.emptyFields.map((x) => FIELD_LABELS[x] || x).join("، ")}` : ""}
                        {row.identicalToArabicFields.length ? ` · منسوخ من العربي: ${row.identicalToArabicFields.map((x) => FIELD_LABELS[x] || x).join("، ")}` : ""}
                      </div>
                    </div>
                  </div>

                  {row.qualityNotes && row.qualityNotes.length > 0 && (
                    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                      <div className="mb-1 font-semibold">{isArabicMode ? "ملاحظات التدقيق العربي:" : "ملاحظات المترجم الآلي الاحترافي:"}</div>
                      <div className="space-y-1">
                        {row.qualityNotes.slice(0, 4).map((note) => <div key={note}>• {note}</div>)}
                      </div>
                    </div>
                  )}

                  {state.issues.length > 0 && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      <div className="mb-1 font-semibold">ملاحظات التدقيق قبل الحفظ:</div>
                      <div className="space-y-1">
                        {Array.from(new Set(state.issues)).slice(0, 5).map((issue) => <div key={issue}>• {issue}</div>)}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {fieldList(row).map((field) => {
                      const isLong = field === "description" || field === "content";
                      const issues = qualityIssues(row.suggestedTranslation[field] || "", locale, field);
                      const sourceText = displayText(row.sourceArabic[field]);
                      const suggestionText = editableText(row.suggestedTranslation[field]);
                      return (
                        <div key={field} className="grid gap-2 lg:grid-cols-2">
                          <div className="rounded-lg border bg-slate-50 p-3">
                            <div className="mb-1 text-xs font-medium text-muted-foreground">{isArabicMode ? "النص العربي قبل التدقيق" : "العربي الأصلي"} · {FIELD_LABELS[field] || field}</div>
                            <div className={`whitespace-pre-wrap text-sm leading-7 ${isLong ? "max-h-40 overflow-y-auto" : ""}`}>
                              {sourceText || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                              <span>{isArabicMode ? "النص العربي بعد التدقيق" : "الترجمة بعد التدقيق"} · {FIELD_LABELS[field] || field}</span>
                              {issues.length === 0 && normalize(row.suggestedTranslation[field]).length > 0 ? (
                                <span className="text-emerald-700">سليم مبدئيًا</span>
                              ) : issues.length > 0 ? (
                                <span className="text-amber-700">راجع هذا الحقل</span>
                              ) : null}
                            </div>
                            {isLong ? (
                              <Textarea
                                value={suggestionText || ""}
                                onChange={(event) => updateField(rowIndex, field, event.target.value)}
                                placeholder={isArabicMode ? `اكتب النص العربي المدقق هنا...` : `اكتب ترجمة ${FIELD_LABELS[field] || field} بلغة ${LOCALE_NATIVE_NAMES[locale]} هنا...`}
                                className={`min-h-[120px] ${issues.length ? "border-amber-300 focus-visible:ring-amber-300" : ""}`}
                                dir={isArabicMode ? "rtl" : "ltr"}
                              />
                            ) : (
                              <Input
                                value={suggestionText || ""}
                                onChange={(event) => updateField(rowIndex, field, event.target.value)}
                                placeholder={isArabicMode ? `اكتب النص العربي المدقق هنا...` : `اكتب ترجمة ${FIELD_LABELS[field] || field} بلغة ${LOCALE_NATIVE_NAMES[locale]} هنا...`}
                                className={issues.length ? "border-amber-300 focus-visible:ring-amber-300" : ""}
                                dir={isArabicMode ? "rtl" : "ltr"}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
