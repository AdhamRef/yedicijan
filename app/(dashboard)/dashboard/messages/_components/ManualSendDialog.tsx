"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Mail,
  MessageCircle,
  Search,
  User,
  Loader2,
  Send,
  Eye,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_LABELS } from "@/lib/locales";
import { cn } from "@/lib/utils";

interface TemplateRow {
  id: string;
  name: string;
  subject?: string;
}

interface DonorRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferredLang: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

type Channel = "EMAIL" | "WHATSAPP";

export default function ManualSendDialog({ open, onOpenChange, onSent }: Props) {
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [localeOverride, setLocaleOverride] = useState<string>("auto");

  const [donorSearch, setDonorSearch] = useState("");
  const [donorSearchDebounced, setDonorSearchDebounced] = useState("");
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<DonorRow | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);

  // Reset state whenever the dialog reopens so a stale donor/template don't linger.
  useEffect(() => {
    if (open) {
      setChannel("EMAIL");
      setTemplateId(null);
      setLocaleOverride("auto");
      setDonorSearch("");
      setSelectedDonor(null);
      setPreviewSubject(null);
      setPreviewBody(null);
      setPreviewError(null);
    }
  }, [open]);

  // Load templates whenever the channel changes (or dialog opens).
  useEffect(() => {
    if (!open) return;
    setTemplatesLoading(true);
    const url = channel === "EMAIL" ? "/api/templates/email" : "/api/templates/whatsapp";
    axios
      .get(url)
      .then((res) => setTemplates(res.data?.templates ?? []))
      .catch(() => toast.error("فشل تحميل القوالب"))
      .finally(() => setTemplatesLoading(false));
    setTemplateId(null);
  }, [channel, open]);

  // Debounce donor search.
  useEffect(() => {
    const t = setTimeout(() => setDonorSearchDebounced(donorSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [donorSearch]);

  // Donor search results.
  useEffect(() => {
    if (!open || donorSearchDebounced.length < 2) {
      setDonors([]);
      return;
    }
    let cancelled = false;
    setDonorsLoading(true);
    axios
      .get("/api/users", {
        params: { scope: "donors", search: donorSearchDebounced, limit: 10 },
      })
      .then((res) => {
        if (cancelled) return;
        // /api/users returns { users, pagination } per scope=donors.
        const list = (res.data?.users ?? res.data?.donors ?? res.data ?? []) as DonorRow[];
        setDonors(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) toast.error("فشل البحث عن متبرعين");
      })
      .finally(() => {
        if (!cancelled) setDonorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [donorSearchDebounced, open]);

  const refreshPreview = useCallback(async () => {
    if (!templateId) {
      setPreviewSubject(null);
      setPreviewBody(null);
      setPreviewError(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const url =
        channel === "EMAIL"
          ? "/api/templates/email/preview"
          : "/api/templates/whatsapp/preview";
      const payload: Record<string, string> = { templateId };
      if (selectedDonor) payload.userId = selectedDonor.id;
      if (localeOverride !== "auto") payload.locale = localeOverride;
      const res = await axios.post(url, payload);
      if (channel === "EMAIL") {
        setPreviewSubject(res.data?.subject ?? null);
        setPreviewBody(res.data?.html ?? "");
      } else {
        setPreviewSubject(null);
        setPreviewBody(res.data?.body ?? "");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذّر تحميل المعاينة";
      setPreviewError(msg);
    } finally {
      setPreviewLoading(false);
    }
  }, [templateId, channel, selectedDonor, localeOverride]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const canSend = Boolean(templateId && selectedDonor && !sending);

  const recipientMissing = useMemo(() => {
    if (!selectedDonor) return null;
    if (channel === "EMAIL" && !selectedDonor.email) return "هذا المتبرع ليس لديه بريد إلكتروني";
    if (channel === "WHATSAPP" && !selectedDonor.phone) return "هذا المتبرع ليس لديه رقم هاتف";
    return null;
  }, [selectedDonor, channel]);

  const handleSend = async () => {
    if (!canSend || !templateId || !selectedDonor) return;
    setSending(true);
    try {
      const url =
        channel === "EMAIL"
          ? "/api/templates/email/send"
          : "/api/templates/whatsapp/send";
      const payload = {
        templateId,
        ...(localeOverride !== "auto" ? { locale: localeOverride } : {}),
        target: { kind: "user", userId: selectedDonor.id },
      };
      const res = await axios.post(url, payload);
      const sent = Number(res.data?.sent ?? 0);
      const skipped = Number(res.data?.skipped ?? 0);
      const failed = Array.isArray(res.data?.failed) ? res.data.failed.length : 0;
      if (sent > 0) {
        toast.success("تم الإرسال بنجاح");
      } else if (skipped > 0) {
        toast.error("تم التخطّي — معلومات الاتصال غير مكتملة");
      } else if (failed > 0) {
        toast.error("فشل الإرسال");
      } else {
        toast.error("لم يتم الإرسال");
      }
      onSent?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل الإرسال";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[940px] p-0 overflow-hidden max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        <DialogHeader className="px-6 py-4 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Send className="w-5 h-5 text-[#025EB8]" />
            إرسال يدوي لقالب
          </DialogTitle>
          <DialogDescription className="text-right text-xs">
            اختر القناة والقالب والمستلم، عاين الناتج المُرَكَّب بمتغيرات هذا المتبرع، ثم أرسل.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="p-6 space-y-5 overflow-y-auto border-l border-slate-200">
            {/* Channel toggle */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-500">القناة</label>
              <div className="grid grid-cols-2 gap-2">
                <ChannelOption
                  active={channel === "EMAIL"}
                  onClick={() => setChannel("EMAIL")}
                  icon={Mail}
                  label="البريد الإلكتروني"
                />
                <ChannelOption
                  active={channel === "WHATSAPP"}
                  onClick={() => setChannel("WHATSAPP")}
                  icon={MessageCircle}
                  label="واتساب"
                />
              </div>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-500">القالب</label>
              <Select
                value={templateId ?? ""}
                onValueChange={(v) => setTemplateId(v || null)}
                disabled={templatesLoading || templates.length === 0}
              >
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={
                      templatesLoading
                        ? "جارٍ التحميل..."
                        : templates.length === 0
                        ? "لا توجد قوالب"
                        : "اختر قالباً"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{t.name}</span>
                        {t.subject && (
                          <span className="text-[10px] text-slate-500">{t.subject}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Locale override */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-500">
                اللغة (تجاوز اختياري)
              </label>
              <Select value={localeOverride} onValueChange={setLocaleOverride}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs">
                    تلقائي — لغة المتبرع المفضّلة
                  </SelectItem>
                  {Object.entries(LOCALE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-500">المستلم</label>
              {selectedDonor ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {selectedDonor.name ?? "—"}
                    </span>
                    {selectedDonor.email && (
                      <span className="text-xs text-slate-500 truncate" dir="ltr">
                        {selectedDonor.email}
                      </span>
                    )}
                    {selectedDonor.phone && (
                      <span className="text-xs text-slate-500 truncate" dir="ltr">
                        {selectedDonor.phone}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDonor(null)}
                    className="text-slate-500 hover:text-slate-900 shrink-0"
                  >
                    تغيير
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-2.5 pointer-events-none" />
                    <Input
                      placeholder="ابحث بالاسم أو البريد..."
                      value={donorSearch}
                      onChange={(e) => setDonorSearch(e.target.value)}
                      className="h-10 pr-8"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {donorsLoading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                      </div>
                    ) : donorSearchDebounced.length < 2 ? (
                      <p className="p-4 text-center text-xs text-slate-400">
                        اكتب حرفين على الأقل للبحث
                      </p>
                    ) : donors.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">لا توجد نتائج</p>
                    ) : (
                      donors.map((d) => (
                        <button
                          type="button"
                          key={d.id}
                          onClick={() => setSelectedDonor(d)}
                          className="w-full text-right px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-sm text-slate-900 truncate">
                            {d.name ?? "—"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {d.email && <span dir="ltr" className="truncate">{d.email}</span>}
                            {d.email && d.phone && <span>·</span>}
                            {d.phone && <span dir="ltr" className="truncate">{d.phone}</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {recipientMissing && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{recipientMissing}</span>
              </div>
            )}
          </div>

          {/* Right: preview */}
          <div className="flex flex-col bg-slate-50 overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  معاينة
                </span>
                {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
              {previewSubject && (
                <div className="mt-2 text-sm font-medium text-slate-900 truncate" title={previewSubject}>
                  {previewSubject}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!templateId ? (
                <div className="h-full flex items-center justify-center text-center px-6">
                  <div>
                    <ChevronLeft className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      اختر قالباً ومستلماً لرؤية المعاينة بقيم متغيراته الحقيقية.
                    </p>
                  </div>
                </div>
              ) : previewError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
                  {previewError}
                </div>
              ) : channel === "EMAIL" ? (
                <iframe
                  title="معاينة البريد"
                  sandbox=""
                  srcDoc={previewBody ?? ""}
                  className="w-full h-full min-h-[460px] border border-slate-200 rounded-lg bg-white"
                />
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-white p-4 whitespace-pre-wrap text-sm text-slate-900 leading-relaxed min-h-[460px]">
                  {previewBody || "—"}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-white flex-row justify-between items-center sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || Boolean(recipientMissing)}
            className="bg-[#025EB8] hover:bg-[#014fa0] gap-2 min-w-[140px]"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جارٍ الإرسال...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                إرسال الآن
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ChannelOptionProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Mail;
  label: string;
}

function ChannelOption({ active, onClick, icon: Icon, label }: ChannelOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "border-[#025EB8] bg-[#025EB8] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#025EB8]/40 hover:bg-[#025EB8]/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
