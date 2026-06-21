"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Dialog, DialogOverlay, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import type { EmailDocument } from "@/components/email-builder";
import { defaultDocument } from "@/components/email-builder";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/lib/locales";
import { cn } from "@/lib/utils";

const EmailEditor = dynamic(
  () => import("@/components/email-builder").then((m) => m.EmailEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        جاري تحميل المحرر…
      </div>
    ),
  }
);

interface Props {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Variant = { subject: string; document: EmailDocument };
type VariantsState = Partial<Record<SupportedLocale, Variant>>;

interface ApiTemplate {
  id: string;
  name: string;
  subject: string;
  document: EmailDocument;
  translations?: Partial<Record<string, { subject?: string; document?: EmailDocument }>> | null;
}

export function EmailTemplateEditorDialog({ id, open, onOpenChange }: Props) {
  const [name, setName] = React.useState("");
  const [variants, setVariants] = React.useState<VariantsState>({});
  const [activeLocale, setActiveLocale] = React.useState<SupportedLocale>(DEFAULT_LOCALE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!id) {
      setName("");
      setVariants({ [DEFAULT_LOCALE]: { subject: "", document: defaultDocument() } });
      setActiveLocale(DEFAULT_LOCALE);
      return;
    }
    setLoading(true);
    axios
      .get(`/api/templates/email/${id}`)
      .then((res) => {
        const t = res.data?.template as ApiTemplate;
        setName(t?.name ?? "");
        const next: VariantsState = {
          [DEFAULT_LOCALE]: {
            subject: t?.subject ?? "",
            document: (t?.document as EmailDocument) ?? defaultDocument(),
          },
        };
        if (t?.translations) {
          for (const [loc, v] of Object.entries(t.translations)) {
            if (!v) continue;
            if (!SUPPORTED_LOCALES.includes(loc as SupportedLocale)) continue;
            if (loc === DEFAULT_LOCALE) continue;
            const baseDoc = next[DEFAULT_LOCALE]!.document;
            next[loc as SupportedLocale] = {
              subject: v.subject ?? next[DEFAULT_LOCALE]!.subject,
              document: (v.document as EmailDocument) ?? baseDoc,
            };
          }
        }
        setVariants(next);
        setActiveLocale(DEFAULT_LOCALE);
      })
      .catch(() => toast.error("فشل تحميل القالب"))
      .finally(() => setLoading(false));
  }, [id, open]);

  const current = variants[activeLocale];

  const updateCurrent = (patch: Partial<Variant>) => {
    setVariants((prev) => {
      const cur = prev[activeLocale] ?? { subject: "", document: defaultDocument() };
      return { ...prev, [activeLocale]: { ...cur, ...patch } };
    });
  };

  const enableLocale = (loc: SupportedLocale) => {
    setVariants((prev) => {
      if (prev[loc]) return prev;
      const base = prev[DEFAULT_LOCALE] ?? { subject: "", document: defaultDocument() };
      return { ...prev, [loc]: { subject: base.subject, document: base.document } };
    });
    setActiveLocale(loc);
  };

  const removeLocale = (loc: SupportedLocale) => {
    if (loc === DEFAULT_LOCALE) return;
    setVariants((prev) => {
      const next = { ...prev };
      delete next[loc];
      return next;
    });
    setActiveLocale(DEFAULT_LOCALE);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("اسم القالب مطلوب");
      return;
    }
    const arVariant = variants[DEFAULT_LOCALE];
    if (!arVariant?.subject?.trim()) {
      toast.error("الموضوع بالعربية مطلوب");
      return;
    }
    setSaving(true);
    try {
      const translations: Record<string, { subject: string; document: EmailDocument }> = {};
      for (const loc of SUPPORTED_LOCALES) {
        if (loc === DEFAULT_LOCALE) continue;
        const v = variants[loc];
        if (!v) continue;
        translations[loc] = { subject: v.subject, document: v.document };
      }
      const payload = {
        name,
        subject: arVariant.subject,
        document: arVariant.document,
        translations: Object.keys(translations).length > 0 ? translations : null,
      };
      if (id) {
        await axios.patch(`/api/templates/email/${id}`, payload);
      } else {
        await axios.post("/api/templates/email", payload);
      }
      toast.success("تم الحفظ");
      onOpenChange(false);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-[1400px] h-[calc(100%-2rem)] max-h-[95vh] p-0 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card flex flex-col"
        dir="rtl"
      >
        <DialogTitle className="sr-only">
          {id ? "تعديل قالب البريد" : "قالب بريد جديد"}
        </DialogTitle>

        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex-1 grid grid-cols-2 gap-3 max-w-3xl">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">
                اسم القالب (داخلي — لا يُرسل)
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شكر التبرع الشهري"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">
                موضوع البريد ({LOCALE_LABELS[activeLocale]})
              </label>
              <Input
                value={current?.subject ?? ""}
                onChange={(e) => updateCurrent({ subject: e.target.value })}
                placeholder="مرحباً {{user.name}}"
                className="h-9 font-mono text-xs"
                dir={activeLocale === "ar" ? "rtl" : "ltr"}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving} className="bg-[#025EB8] hover:bg-[#025EB8]/90">
              {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              حفظ
            </Button>
          </div>
        </header>

        <LocaleTabs
          variants={variants}
          activeLocale={activeLocale}
          setActiveLocale={setActiveLocale}
          enableLocale={enableLocale}
          removeLocale={removeLocale}
        />

        <div className="flex-1 overflow-hidden p-4">
          {loading || !current ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin me-2" /> جاري التحميل…
            </div>
          ) : (
            <EmailEditor
              key={activeLocale}
              value={current.document}
              onChange={(d) => updateCurrent({ document: d })}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocaleTabs({
  variants,
  activeLocale,
  setActiveLocale,
  enableLocale,
  removeLocale,
}: {
  variants: VariantsState;
  activeLocale: SupportedLocale;
  setActiveLocale: (loc: SupportedLocale) => void;
  enableLocale: (loc: SupportedLocale) => void;
  removeLocale: (loc: SupportedLocale) => void;
}) {
  return (
    <div className="px-6 py-2 border-b border-border bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto shrink-0">
      <span className="text-[11px] font-semibold text-slate-500 me-2 shrink-0">اللغات:</span>
      {SUPPORTED_LOCALES.map((loc) => {
        const has = !!variants[loc];
        const active = activeLocale === loc;
        const isDefault = loc === DEFAULT_LOCALE;
        return (
          <div key={loc} className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => (has ? setActiveLocale(loc) : enableLocale(loc))}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                active
                  ? "bg-[#025EB8] text-white border-[#025EB8]"
                  : has
                    ? "bg-white text-slate-700 border-border hover:border-[#025EB8]"
                    : "bg-transparent text-slate-400 border-dashed border-slate-300 hover:border-slate-500 hover:text-slate-600"
              )}
              title={
                has
                  ? `تحرير النسخة بـ${LOCALE_LABELS[loc]}`
                  : `إضافة نسخة بـ${LOCALE_LABELS[loc]}`
              }
            >
              {LOCALE_LABELS[loc]}
              {!has && <span className="ms-1">+</span>}
              {isDefault && <span className="ms-1 text-[9px] opacity-70">افتراضي</span>}
            </button>
            {has && !isDefault && (
              <button
                type="button"
                onClick={() => removeLocale(loc)}
                className="ms-0.5 text-slate-400 hover:text-red-600 p-1"
                title={`حذف نسخة ${LOCALE_LABELS[loc]}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
