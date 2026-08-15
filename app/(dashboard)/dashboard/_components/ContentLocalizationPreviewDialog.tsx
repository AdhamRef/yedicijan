"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, Loader2, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const FIELD_LABELS: Record<string, string> = {
  title: "العنوان",
  name: "الاسم",
  description: "الوصف",
  content: "المحتوى",
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

function plainText(value: string | null | undefined): string {
  const raw = value?.trim() || "";
  if (!raw) return "";
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const walk = (node: unknown): string => {
        if (!node) return "";
        if (typeof node === "string") return node;
        if (Array.isArray(node)) return node.map(walk).filter(Boolean).join(" ");
        if (typeof node !== "object") return "";
        const item = node as { text?: unknown; content?: unknown };
        return [typeof item.text === "string" ? item.text : "", walk(item.content)]
          .filter(Boolean)
          .join(" ");
      };
      return walk(parsed).replace(/\s+/g, " ").trim();
    } catch {
      // Continue with HTML/plain text cleanup.
    }
  }
  return raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function ContentLocalizationPreviewDialog({
  section,
  open,
  onOpenChange,
  defaultLocale = "de",
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

  async function loadRows() {
    setLoading(true);
    try {
      const response = await axios.get("/api/admin/content-localization/preview", {
        params: { section, locale, limit: 10 },
      });
      setRows(response.data?.rows || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "تعذر تجهيز المعاينة");
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    setGenerating(true);
    try {
      const response = await axios.post("/api/admin/content-localization/preview", {
        action: "generate",
        section,
        locale,
        limit: 8,
      });
      setRows(response.data?.rows || []);
      toast.success("تم تجهيز معاينة للمراجعة دون حفظ أي تغيير");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "تعذر توليد المعاينة");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (open) void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locale, section]);

  const busy = loading || generating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            معاينة النصوص والترجمات
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">وضع قراءة ومعاينة فقط</p>
              <p className="mt-1 leading-6">
                لا يتم حفظ أوتعديل أي نص من هذه النافذة. ستعود عملية التطبيق في PR مستقلة بعد بناء:
                Preview → Review → Approve → Apply → Rollback.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOCALE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadRows} disabled={busy}>
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              تحديث المعاينة
            </Button>
            <Button
              variant="outline"
              onClick={generatePreview}
              disabled={busy}
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              توليد معاينة احترافية
            </Button>
          </div>
        </div>

        {busy ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            جاري تجهيز المعاينة…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-emerald-50 p-6 text-center text-emerald-700">
            لا توجد عناصر ناقصة في هذه الدفعة.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <article key={`${row.type}-${row.id}`} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{row.label}</h3>
                    <p className="text-xs text-muted-foreground">{row.typeLabel} · {LOCALE_LABELS[locale]}</p>
                  </div>
                  {(row.missingFields.length > 0 || row.emptyFields.length > 0 || row.identicalToArabicFields.length > 0) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" /> يحتاج مراجعة
                    </span>
                  )}
                </div>

                {row.qualityNotes?.length ? (
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
                    {row.qualityNotes.slice(0, 4).map((note) => <p key={note}>• {note}</p>)}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {Object.keys(row.sourceArabic).map((field) => (
                    <div key={field} className="grid gap-2 lg:grid-cols-2">
                      <div className="rounded-lg border bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">العربي الأصلي · {FIELD_LABELS[field] || field}</p>
                        <p className="whitespace-pre-wrap text-sm leading-7">{plainText(row.sourceArabic[field]) || "—"}</p>
                      </div>
                      <div className="rounded-lg border bg-white p-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">المعاينة المقترحة · {FIELD_LABELS[field] || field}</p>
                        <p className="whitespace-pre-wrap text-sm leading-7" dir={locale === "ar" ? "rtl" : "ltr"}>
                          {plainText(row.suggestedTranslation[field]) || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
