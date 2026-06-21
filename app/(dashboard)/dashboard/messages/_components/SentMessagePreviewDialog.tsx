"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Mail,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  Globe,
  Loader2,
  FileCode,
  Zap,
  Send,
  FileText,
  Copy,
  CheckCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LOCALE_LABELS } from "@/lib/locales";
import { cn } from "@/lib/utils";
import type { SentMessageRow } from "./OutboundHistoryTab";

interface FullSentMessage extends SentMessageRow {
  renderedBody: string;
  // The TemplateContext is JSON — typing it as unknown lets us render it as a
  // tree without coupling the dialog to context internals.
  variables: unknown;
}

const STATUS_META: Record<SentMessageRow["status"], { bg: string; text: string; label: string; icon: typeof CheckCircle2 }> = {
  SENT: { bg: "bg-emerald-50", text: "text-emerald-700", label: "أُرسلت", icon: CheckCircle2 },
  FAILED: { bg: "bg-rose-50", text: "text-rose-700", label: "فشلت", icon: XCircle },
  SKIPPED: { bg: "bg-amber-50", text: "text-amber-700", label: "تخطّي", icon: AlertTriangle },
};

const TRIGGER_EVENT_LABELS: Record<string, string> = {
  DONATION_PAID: "تبرع ناجح",
  DONATION_FAILED: "تبرع فاشل",
  FIRST_DONATION: "أول تبرع",
  USER_REGISTERED: "تسجيل مستخدم",
  SUBSCRIPTION_CREATED: "إنشاء اشتراك",
  SUBSCRIPTION_PAYMENT: "دفعة اشتراك",
  SUBSCRIPTION_CANCELLED: "إلغاء اشتراك",
};

interface Props {
  id: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function SentMessagePreviewDialog({ id, onOpenChange }: Props) {
  const [data, setData] = useState<FullSentMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"subject" | "body" | "vars" | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    axios
      .get(`/api/admin/sent-messages/${id}`)
      .then((res) => {
        if (!cancelled) setData(res.data?.item ?? null);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const copy = async (key: "subject" | "body" | "vars", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const ChannelIcon = data?.channel === "WHATSAPP" ? MessageCircle : Mail;
  const statusMeta = data ? STATUS_META[data.status] : null;
  const StatusIcon = statusMeta?.icon;

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-[720px] overflow-y-auto p-0"
        dir="rtl"
      >
        <SheetHeader className="p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <SheetTitle className="flex items-center justify-between gap-3 text-right">
            <span className="flex items-center gap-2">
              <ChannelIcon className="w-5 h-5 text-[#025EB8]" />
              معاينة الرسالة المرسلة
            </span>
            {statusMeta && StatusIcon && (
              <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", statusMeta.bg, statusMeta.text)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusMeta.label}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading || !data ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <MetaRow label="القالب" value={data.templateName} icon={FileText} />
              <MetaRow
                label="القناة"
                value={data.channel === "EMAIL" ? "البريد الإلكتروني" : "واتساب"}
                icon={ChannelIcon}
              />
              <MetaRow
                label="المصدر"
                value={
                  data.origin === "TRIGGER"
                    ? "تلقائي" + (data.triggerEvent ? ` — ${TRIGGER_EVENT_LABELS[data.triggerEvent] ?? data.triggerEvent}` : "")
                    : data.origin === "MANUAL"
                    ? "يدوي" + (data.actorName ? ` — ${data.actorName}` : "")
                    : "أرشيف (سجل قديم)"
                }
                icon={data.origin === "TRIGGER" ? Zap : data.origin === "MANUAL" ? Send : FileText}
              />
              <MetaRow
                label="اللغة"
                value={LOCALE_LABELS[data.locale as keyof typeof LOCALE_LABELS] ?? data.locale}
                icon={Globe}
              />
              <MetaRow
                label="التاريخ"
                value={new Date(data.createdAt).toLocaleString("ar-EG", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
                icon={Calendar}
              />
              {data.donationId && (
                <MetaRow label="معرّف التبرع" value={data.donationId} icon={FileText} mono />
              )}
            </div>

            {/* Recipient */}
            {data.origin !== "BACKFILL" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">المستلم</div>
                <div className="space-y-1.5 text-sm">
                  {data.recipientName && (
                    <div className="flex items-center gap-2 text-slate-900 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {data.recipientName}
                    </div>
                  )}
                  {data.recipientEmail && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{data.recipientEmail}</span>
                    </div>
                  )}
                  {data.recipientPhone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{data.recipientPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
                <div className="font-semibold mb-1">سجل أرشيفي</div>
                <p className="text-xs">
                  هذا الإدخال أنشئ من سجل التدقيق القديم — لا يحتوي على نسخة فردية لكل مستلم أو محتوى مُرَكَّب.
                </p>
                {data.backfillTotal != null && (
                  <p className="text-xs mt-2">
                    الإجمالي: {data.backfillTotal} · ناجح: {data.backfillSent ?? 0} · فاشل: {data.backfillFailed ?? 0} · تخطّي: {data.backfillSkipped ?? 0}
                  </p>
                )}
              </div>
            )}

            {/* Error message */}
            {data.errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <div className="font-semibold mb-1 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  رسالة الخطأ
                </div>
                <p className="text-xs whitespace-pre-wrap break-words">{data.errorMessage}</p>
              </div>
            )}

            {/* Content tabs */}
            {data.origin !== "BACKFILL" && (
              <Tabs defaultValue="preview" dir="rtl">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="preview">معاينة</TabsTrigger>
                  <TabsTrigger value="source">المصدر</TabsTrigger>
                  <TabsTrigger value="variables">المتغيرات</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4 space-y-3">
                  {data.renderedSubject && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">الموضوع</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => copy("subject", data.renderedSubject!)}
                        >
                          {copied === "subject" ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          نسخ
                        </Button>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 font-medium">
                        {data.renderedSubject}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {data.channel === "EMAIL" ? "نسخة البريد المُرسَلة" : "نسخة الرسالة"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => copy("body", data.renderedBody)}
                      >
                        {copied === "body" ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        نسخ
                      </Button>
                    </div>
                    {data.channel === "EMAIL" ? (
                      <iframe
                        title="معاينة البريد"
                        sandbox=""
                        srcDoc={data.renderedBody}
                        className="w-full h-[500px] border border-slate-200 rounded-lg bg-white"
                      />
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-emerald-50/40 p-4 whitespace-pre-wrap text-sm text-slate-900 leading-relaxed">
                        {data.renderedBody || "—"}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="source" className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      {data.channel === "EMAIL" ? "HTML الخام" : "نص الرسالة"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => copy("body", data.renderedBody)}
                    >
                      {copied === "body" ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      نسخ
                    </Button>
                  </div>
                  <pre
                    dir="ltr"
                    className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-3 text-[11px] leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap break-words"
                  >
                    {data.renderedBody || "—"}
                  </pre>
                </TabsContent>

                <TabsContent value="variables" className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      قيم المتغيرات وقت الإرسال
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={() => copy("vars", JSON.stringify(data.variables, null, 2))}
                    >
                      {copied === "vars" ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      نسخ
                    </Button>
                  </div>
                  <pre
                    dir="ltr"
                    className="rounded-lg border border-slate-200 bg-slate-50 text-slate-800 p-3 text-[11px] leading-relaxed overflow-auto max-h-[500px]"
                  >
                    {data.variables ? JSON.stringify(data.variables, null, 2) : "(لا توجد متغيرات)"}
                  </pre>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface MetaRowProps {
  label: string;
  value: string;
  icon: typeof Mail;
  mono?: boolean;
}

function MetaRow({ label, value, icon: Icon, mono }: MetaRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className={cn("inline-flex items-center gap-1.5 text-sm text-slate-900", mono && "font-mono text-xs")}>
        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate" title={value}>{value}</span>
      </span>
    </div>
  );
}
