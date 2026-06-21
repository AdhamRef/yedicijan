"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Dialog, DialogOverlay, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { VARIABLE_CATALOG, mergeText } from "@/lib/templates/variables";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/lib/locales";
import { cn } from "@/lib/utils";

interface Props {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAMPLE_CTX = (() => {
  const flat: Record<string, string> = {};
  for (const g of VARIABLE_CATALOG) {
    for (const e of g.entries) {
      flat[e.token.replace(/[{}]/g, "").trim()] = e.exampleValue;
    }
  }
  const get = (k: string) => flat[k] ?? "";
  return {
    user: {
      id: "sample",
      name: get("user.name"),
      email: get("user.email"),
      phone: get("user.phone"),
      countryName: get("user.countryName"),
      countryCode: get("user.countryCode"),
      city: get("user.city"),
      region: "",
      preferredLang: get("user.preferredLang"),
    },
    donations: [
      {
        id: "sample-1",
        amount: get("amount"),
        amountUSD: get("amountUSD"),
        currency: get("currency"),
        totalAmount: get("amount"),
        status: "PAID",
        createdAt: get("createdAt"),
        campaignTitle: get("campaignTitle"),
        itemCount: "1",
        items: [
          {
            campaignTitle: get("campaignTitle"),
            amount: get("amount"),
            amountUSD: get("amountUSD"),
            currency: get("currency"),
            shareCount: "",
          },
        ],
      },
    ],
    totals: {
      count: get("totals.count"),
      amountUSD: get("totals.amountUSD"),
      lastAt: get("totals.lastAt"),
    },
    donation: {
      id: "sample-1",
      amount: get("amount"),
      amountUSD: get("amountUSD"),
      currency: get("currency"),
      totalAmount: get("amount"),
      status: "PAID",
      createdAt: get("createdAt"),
      campaignTitle: get("campaignTitle"),
      itemCount: "2",
      items: [
        {
          campaignTitle: get("campaignTitle"),
          amount: "25",
          amountUSD: "25",
          currency: get("currency"),
          shareCount: "",
        },
        {
          campaignTitle: "حملة الشتاء",
          amount: "25",
          amountUSD: "25",
          currency: get("currency"),
          shareCount: "",
        },
      ],
    },
  };
})();

type BodiesState = Partial<Record<SupportedLocale, string>>;

interface ApiTemplate {
  id: string;
  name: string;
  body: string;
  translations?: Partial<Record<string, { body?: string }>> | null;
}

export function WhatsappTemplateEditorDialog({ id, open, onOpenChange }: Props) {
  const [name, setName] = React.useState("");
  const [bodies, setBodies] = React.useState<BodiesState>({});
  const [activeLocale, setActiveLocale] = React.useState<SupportedLocale>(DEFAULT_LOCALE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!id) {
      setName("");
      setBodies({ [DEFAULT_LOCALE]: "مرحباً {{user.name}}، شكراً لتبرّعك!" });
      setActiveLocale(DEFAULT_LOCALE);
      return;
    }
    setLoading(true);
    axios
      .get(`/api/templates/whatsapp/${id}`)
      .then((res) => {
        const t = res.data?.template as ApiTemplate;
        setName(t?.name ?? "");
        const next: BodiesState = { [DEFAULT_LOCALE]: t?.body ?? "" };
        if (t?.translations) {
          for (const [loc, v] of Object.entries(t.translations)) {
            if (!v?.body) continue;
            if (!SUPPORTED_LOCALES.includes(loc as SupportedLocale)) continue;
            if (loc === DEFAULT_LOCALE) continue;
            next[loc as SupportedLocale] = v.body;
          }
        }
        setBodies(next);
        setActiveLocale(DEFAULT_LOCALE);
      })
      .catch(() => toast.error("فشل تحميل القالب"))
      .finally(() => setLoading(false));
  }, [id, open]);

  const currentBody = bodies[activeLocale] ?? "";

  const updateCurrentBody = (v: string) => {
    setBodies((prev) => ({ ...prev, [activeLocale]: v }));
  };

  const enableLocale = (loc: SupportedLocale) => {
    setBodies((prev) => {
      if (prev[loc] != null) return prev;
      return { ...prev, [loc]: prev[DEFAULT_LOCALE] ?? "" };
    });
    setActiveLocale(loc);
  };

  const removeLocale = (loc: SupportedLocale) => {
    if (loc === DEFAULT_LOCALE) return;
    setBodies((prev) => {
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
    const arBody = bodies[DEFAULT_LOCALE]?.trim();
    if (!arBody) {
      toast.error("المحتوى بالعربية مطلوب");
      return;
    }
    setSaving(true);
    try {
      const translations: Record<string, { body: string }> = {};
      for (const loc of SUPPORTED_LOCALES) {
        if (loc === DEFAULT_LOCALE) continue;
        const b = bodies[loc]?.trim();
        if (b) translations[loc] = { body: b };
      }
      const payload = {
        name,
        body: arBody,
        translations: Object.keys(translations).length > 0 ? translations : null,
      };
      if (id) {
        await axios.patch(`/api/templates/whatsapp/${id}`, payload);
      } else {
        await axios.post("/api/templates/whatsapp", payload);
      }
      toast.success("تم الحفظ");
      onOpenChange(false);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      updateCurrentBody(currentBody + token);
      return;
    }
    const start = el.selectionStart ?? currentBody.length;
    const end = el.selectionEnd ?? currentBody.length;
    const next = currentBody.slice(0, start) + token + currentBody.slice(end);
    updateCurrentBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const preview = React.useMemo(() => mergeText(currentBody, SAMPLE_CTX), [currentBody]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/50" />
      <DialogContent
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-6 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card"
        dir="rtl"
      >
        <DialogTitle className="text-lg font-bold mb-4">
          {id ? "تعديل قالب الواتساب" : "قالب واتساب جديد"}
        </DialogTitle>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin me-2" /> جاري التحميل…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">اسم القالب (داخلي)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شكر التبرع"
              />
            </div>

            <div className="rounded-md bg-slate-50/60 border border-border px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-500 me-2 shrink-0">اللغات:</span>
              {SUPPORTED_LOCALES.map((loc) => {
                const has = bodies[loc] != null;
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
                          ? "bg-[#25D366] text-white border-[#25D366]"
                          : has
                            ? "bg-white text-slate-700 border-border hover:border-[#25D366]"
                            : "bg-transparent text-slate-400 border-dashed border-slate-300 hover:border-slate-500 hover:text-slate-600"
                      )}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  المحتوى ({LOCALE_LABELS[activeLocale]})
                </label>
                <Textarea
                  ref={bodyRef}
                  value={currentBody}
                  onChange={(e) => updateCurrentBody(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                  dir={activeLocale === "ar" ? "rtl" : "ltr"}
                  placeholder="اكتب رسالة الواتساب هنا"
                />
                <div className="rounded-md border border-border bg-slate-50/60 p-2 max-h-44 overflow-y-auto space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500">المتغيّرات المتاحة (اضغط للإدراج)</p>
                  {VARIABLE_CATALOG.map((g) => (
                    <div key={g.group}>
                      <div className="text-[10px] font-semibold text-slate-500 mb-1">{g.group}</div>
                      <div className="flex flex-wrap gap-1">
                        {g.entries.map((e) => (
                          <button
                            key={e.token}
                            type="button"
                            onClick={() => insertToken(e.token)}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-border hover:bg-blue-50"
                            title={e.label}
                          >
                            {e.token}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  معاينة ({LOCALE_LABELS[activeLocale]} — ببيانات تجريبية)
                </label>
                <div className="rounded-lg border border-border bg-[#E5DDD5] p-4 min-h-[260px]">
                  <div
                    className="bg-white rounded-lg p-3 shadow-sm whitespace-pre-wrap text-sm"
                    dir={activeLocale === "ar" ? "rtl" : "ltr"}
                  >
                    {preview || (
                      <span className="text-muted-foreground italic">المعاينة ستظهر هنا</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving} className="bg-[#25D366] hover:bg-[#25D366]/90">
                {saving && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                حفظ
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
