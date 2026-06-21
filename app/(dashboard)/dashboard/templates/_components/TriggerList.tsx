"use client";

import * as React from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Mail, MessageCircle } from "lucide-react";
import { TriggerEditorDialog } from "./TriggerEditorDialog";
import { EVENT_CATALOG } from "@/lib/events/catalog";

interface TriggerRow {
  id: string;
  event: string;
  channel: "EMAIL" | "WHATSAPP";
  templateId: string;
  templateName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const eventLabel = (e: string) =>
  EVENT_CATALOG.find((x) => x.event === e)?.label ?? e;

export function TriggerList() {
  const [triggers, setTriggers] = React.useState<TriggerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editorOpen, setEditorOpen] = React.useState(false);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/templates/triggers");
      setTriggers(res.data?.triggers ?? []);
    } catch {
      toast.error("فشل في تحميل الأحداث");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await axios.patch(`/api/templates/triggers/${id}`, { enabled });
      setTriggers((prev) => prev.map((t) => (t.id === id ? { ...t, enabled } : t)));
    } catch {
      toast.error("فشل التحديث");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("حذف هذا الحدث التلقائي؟")) return;
    try {
      await axios.delete(`/api/templates/triggers/${id}`);
      toast.success("تم الحذف");
      fetchAll();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {loading ? "…" : `${triggers.length} حدث تلقائي`}
        </p>
        <Button
          size="sm"
          onClick={() => setEditorOpen(true)}
          className="gap-2 bg-[#025EB8] hover:bg-[#025EB8]/90"
        >
          <Plus className="w-4 h-4" /> حدث جديد
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-blue-50/50 p-3 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold mb-1">كيف يعمل النظام؟</p>
        <p>
          عند وقوع الحدث (مثلاً نجاح تبرّع)، يقوم النظام تلقائيًا بإرسال القالب المحدّد للمتبرع المعني — بدون أي تدخّل يدوي.
          استخدم متغيّرات مثل <span className="font-mono">{"{{donation.amountUSD}}"}</span> داخل القالب لتخصيص الرسالة.
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="text-right py-3 px-4 font-semibold text-slate-700">الحدث</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">القناة</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">القالب</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">مفعّل</th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </td>
              </tr>
            ) : triggers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  لا توجد أحداث تلقائية بعد — اضغط «حدث جديد» للبدء
                </td>
              </tr>
            ) : (
              triggers.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-medium text-slate-900">{eventLabel(t.event)}</td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      {t.channel === "EMAIL" ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-[#025EB8]" /> بريد
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> واتساب
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {t.templateName ?? <span className="text-red-500 text-xs">القالب محذوف</span>}
                  </td>
                  <td className="py-3 px-4">
                    <Checkbox
                      checked={t.enabled}
                      onCheckedChange={(checked) =>
                        toggleEnabled(t.id, checked === true)
                      }
                      aria-label={t.enabled ? "تعطيل الحدث" : "تفعيل الحدث"}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(t.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5 me-1" /> حذف
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TriggerEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) fetchAll();
        }}
      />
    </div>
  );
}
