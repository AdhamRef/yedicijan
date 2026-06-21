"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Mail,
  MessageCircle,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Eye,
  Loader2,
  FileText,
  Zap,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_LABELS } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { useViewUserProfile } from "@/context/ViewUserProfileContext";
import SentMessagePreviewDialog from "./SentMessagePreviewDialog";
import ManualSendDialog from "./ManualSendDialog";

export interface SentMessageRow {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  origin: "MANUAL" | "TRIGGER" | "BACKFILL";
  status: "SENT" | "FAILED" | "SKIPPED";
  templateId: string | null;
  templateName: string;
  triggerEvent: string | null;
  locale: string;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  recipientName: string | null;
  renderedSubject: string | null;
  errorMessage: string | null;
  actorId: string | null;
  actorName: string | null;
  donationId: string | null;
  backfillTotal: number | null;
  backfillSent: number | null;
  backfillFailed: number | null;
  backfillSkipped: number | null;
  createdAt: string;
}

interface Stats {
  channel: "EMAIL" | "WHATSAPP";
  status: "SENT" | "FAILED" | "SKIPPED";
  count: number;
}

const PAGE_SIZE = 20;

const TRIGGER_EVENT_LABELS: Record<string, string> = {
  DONATION_PAID: "تبرع ناجح",
  DONATION_FAILED: "تبرع فاشل",
  FIRST_DONATION: "أول تبرع",
  USER_REGISTERED: "تسجيل مستخدم",
  SUBSCRIPTION_CREATED: "إنشاء اشتراك",
  SUBSCRIPTION_PAYMENT: "دفعة اشتراك",
  SUBSCRIPTION_CANCELLED: "إلغاء اشتراك",
};

const STATUS_STYLES: Record<SentMessageRow["status"], { bg: string; text: string; label: string; icon: typeof CheckCircle2 }> = {
  SENT: { bg: "bg-emerald-50", text: "text-emerald-700", label: "أُرسلت", icon: CheckCircle2 },
  FAILED: { bg: "bg-rose-50", text: "text-rose-700", label: "فشلت", icon: XCircle },
  SKIPPED: { bg: "bg-amber-50", text: "text-amber-700", label: "تخطّي", icon: AlertTriangle },
};

const ORIGIN_LABELS: Record<SentMessageRow["origin"], string> = {
  MANUAL: "يدوي",
  TRIGGER: "تلقائي",
  BACKFILL: "أرشيف",
};

export default function OutboundHistoryTab() {
  const [rows, setRows] = useState<SentMessageRow[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { openUserProfile } = useViewUserProfile();

  const fetchRows = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_SIZE));
        if (search) params.set("search", search);
        if (channelFilter !== "all") params.set("channel", channelFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (originFilter !== "all") params.set("origin", originFilter);
        if (triggerFilter !== "all") params.set("triggerEvent", triggerFilter);

        const res = await axios.get(`/api/admin/sent-messages?${params}`);
        const items: SentMessageRow[] = res.data?.items ?? [];
        setRows((prev) => (append ? [...prev, ...items] : items));
        setTotal(res.data?.pagination?.total ?? 0);
        setStats(res.data?.stats ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, channelFilter, statusFilter, originFilter, triggerFilter]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    fetchRows(1, false);
  }, [search, channelFilter, statusFilter, originFilter, triggerFilter, fetchRows]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRows(next, true);
  };

  const hasMore = rows.length < total && !loadingMore;

  // Summary tiles — sum across the active filter set.
  const summary = useMemo(() => {
    let emailSent = 0, emailFailed = 0, whatsappSent = 0, whatsappFailed = 0;
    for (const s of stats) {
      if (s.channel === "EMAIL" && s.status === "SENT") emailSent += s.count;
      if (s.channel === "EMAIL" && s.status === "FAILED") emailFailed += s.count;
      if (s.channel === "WHATSAPP" && s.status === "SENT") whatsappSent += s.count;
      if (s.channel === "WHATSAPP" && s.status === "FAILED") whatsappFailed += s.count;
    }
    return { emailSent, emailFailed, whatsappSent, whatsappFailed };
  }, [stats]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
        <p className="text-muted-foreground text-sm text-right">
          سجل كل رسائل القوالب الصادرة (بريد + واتساب) — يدوية وتلقائية — مع المعاينة الكاملة وقيم المتغيرات.
        </p>
        <Button
          onClick={() => setShowSendDialog(true)}
          className="bg-[#025EB8] hover:bg-[#014fa0] gap-2 self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          إرسال يدوي
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile icon={Mail} label="بريد ناجح" value={summary.emailSent} accent="emerald" />
        <SummaryTile icon={Mail} label="بريد فاشل" value={summary.emailFailed} accent="rose" />
        <SummaryTile icon={MessageCircle} label="واتساب ناجح" value={summary.whatsappSent} accent="emerald" />
        <SummaryTile icon={MessageCircle} label="واتساب فاشل" value={summary.whatsappFailed} accent="rose" />
      </div>

      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 justify-end">
            <Filter className="w-4 h-4 shrink-0" />
            تصفية وبحث
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2 text-right sm:col-span-2 lg:col-span-1">
              <label className="text-[11px] font-medium text-slate-500">بحث (اسم القالب، المستلم، الموضوع)</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-2.5 pointer-events-none" />
                <Input
                  placeholder="بحث..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border-slate-200 bg-slate-50 pr-8"
                />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[11px] font-medium text-slate-500">القناة</label>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">الكل</SelectItem>
                  <SelectItem value="EMAIL" className="text-xs">البريد</SelectItem>
                  <SelectItem value="WHATSAPP" className="text-xs">واتساب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[11px] font-medium text-slate-500">الحالة</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">الكل</SelectItem>
                  <SelectItem value="SENT" className="text-xs">أُرسلت</SelectItem>
                  <SelectItem value="FAILED" className="text-xs">فشلت</SelectItem>
                  <SelectItem value="SKIPPED" className="text-xs">تخطّي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[11px] font-medium text-slate-500">المصدر</label>
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">الكل</SelectItem>
                  <SelectItem value="MANUAL" className="text-xs">يدوي</SelectItem>
                  <SelectItem value="TRIGGER" className="text-xs">تلقائي</SelectItem>
                  <SelectItem value="BACKFILL" className="text-xs">أرشيف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[11px] font-medium text-slate-500">الحدث التلقائي</label>
              <Select value={triggerFilter} onValueChange={setTriggerFilter}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">الكل</SelectItem>
                  {Object.entries(TRIGGER_EVENT_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right mb-3">
          السجل ({total.toLocaleString("en-US")})
        </h2>
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto" dir="rtl">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">المتبرع</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">القناة</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">القالب</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">المستلم</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">الحالة</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">اللغة</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">التاريخ</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500">
                        لا توجد رسائل مطابقة
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const statusStyle = STATUS_STYLES[r.status];
                      const StatusIcon = statusStyle.icon;
                      const ChannelIcon = r.channel === "EMAIL" ? Mail : MessageCircle;
                      const donorLabel =
                        r.recipientName || r.recipientEmail || r.recipientPhone || null;
                      return (
                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                          <td className="py-1.5 px-2">
                            {r.recipientUserId ? (
                              <button
                                type="button"
                                onClick={() => r.recipientUserId && openUserProfile(r.recipientUserId)}
                                className="text-right w-full max-w-[200px] rounded-md -mx-0.5 px-0.5 py-0 hover:bg-slate-100/80 transition-colors cursor-pointer border-0 bg-transparent"
                              >
                                <p className="font-medium text-slate-900">
                                  {donorLabel || "—"}
                                </p>
                                {r.recipientEmail && r.recipientName && (
                                  <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                    {r.recipientEmail}
                                  </p>
                                )}
                              </button>
                            ) : (
                              <div className="text-right max-w-[200px] py-0">
                                <p className="font-medium text-slate-900">
                                  {donorLabel || (r.origin === "BACKFILL" ? "—" : "زائر")}
                                </p>
                                {r.recipientEmail && r.recipientName && (
                                  <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                    {r.recipientEmail}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                              r.channel === "EMAIL" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                              <ChannelIcon className="w-3.5 h-3.5" />
                              {r.channel === "EMAIL" ? "بريد" : "واتساب"}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-900 truncate" title={r.templateName}>
                                {TRIGGER_EVENT_LABELS[r.templateName] ?? r.templateName}
                              </span>
                              {r.renderedSubject && (
                                <span className="text-xs text-slate-500 truncate" title={r.renderedSubject}>
                                  {r.renderedSubject}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                {r.origin === "TRIGGER" ? (
                                  <Zap className="w-2.5 h-2.5" />
                                ) : r.origin === "MANUAL" ? (
                                  <Send className="w-2.5 h-2.5" />
                                ) : (
                                  <FileText className="w-2.5 h-2.5" />
                                )}
                                {ORIGIN_LABELS[r.origin]}
                                {r.origin === "MANUAL" && r.actorName ? ` · ${r.actorName}` : ""}
                                {r.triggerEvent && r.origin === "TRIGGER"
                                  ? ` · ${TRIGGER_EVENT_LABELS[r.triggerEvent] ?? r.triggerEvent}`
                                  : ""}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[220px]">
                            {r.origin === "BACKFILL" ? (
                              <span className="text-xs text-slate-500">
                                {r.backfillTotal != null
                                  ? `${r.backfillSent ?? 0} ناجح / ${r.backfillTotal} إجمالي`
                                  : "—"}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {r.recipientEmail && (
                                  <span className="text-xs text-slate-600 truncate" title={r.recipientEmail}>
                                    {r.recipientEmail}
                                  </span>
                                )}
                                {r.recipientPhone && (
                                  <span className="text-xs text-slate-600 truncate" dir="ltr">
                                    {r.recipientPhone}
                                  </span>
                                )}
                                {!r.recipientEmail && !r.recipientPhone && (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                              statusStyle.bg, statusStyle.text
                            )}>
                              <StatusIcon className="w-3 h-3" />
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {LOCALE_LABELS[r.locale as keyof typeof LOCALE_LABELS] ?? r.locale}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(r.createdAt).toLocaleDateString("ar-EG", { dateStyle: "medium" })}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(r.createdAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-[#025EB8] hover:text-[#025EB8] hover:bg-[#025EB8]/8"
                              onClick={() => setSelectedId(r.id)}
                            >
                              <Eye className="w-4 h-4" />
                              معاينة
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="p-4 border-t border-slate-100 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  تحميل المزيد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <SentMessagePreviewDialog
        id={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />

      <ManualSendDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        onSent={() => {
          setShowSendDialog(false);
          fetchRows(1, false);
        }}
      />
    </div>
  );
}

interface SummaryTileProps {
  icon: typeof Mail;
  label: string;
  value: number;
  accent: "emerald" | "rose" | "blue";
}

function SummaryTile({ icon: Icon, label, value, accent }: SummaryTileProps) {
  const palette = {
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", num: "text-emerald-700" },
    rose: { bg: "bg-rose-50", icon: "text-rose-600", num: "text-rose-700" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", num: "text-blue-700" },
  }[accent];
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 flex items-center gap-3">
      <span className={cn("rounded-lg p-2 shrink-0", palette.bg, palette.icon)}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span className={cn("text-lg font-bold tabular-nums", palette.num)}>
          {value.toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );
}
