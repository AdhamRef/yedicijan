"use client";
import { useEffect, useState } from "react";

type Status = {
  doNotContact: boolean;
  whatsapp: { hasPhone: boolean; optedIn: boolean; stopped: boolean; at: string | null; undeliverable: number };
  email: { hasEmail: boolean; suppressed: string | null };
};
const EMAIL_REASON: Record<string, string> = { unsubscribe: "ألغى الاشتراك", "hard-bounce": "بريد مرتجع (لا يصل)", complaint: "أبلغ عن رسالة كمزعجة" };

/** What the donor decided, per channel, from the fields the senders enforce (ported from Minber al-Aqsa #275). */
export default function DonorContactStatus({ userId }: { userId: string }) {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/users/${userId}/contact-status`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (active && d) setS(d as Status); }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);
  if (!s) return null;
  const line = (ok: boolean, label: string, text: string) => (
    <div className="flex items-center justify-between gap-2 py-1 text-sm"><span className="text-slate-500">{label}</span><span className={ok ? "text-emerald-700" : "font-semibold text-red-700"}>{ok ? "✓ " : "⛔ "}{text}</span></div>
  );
  const wa = !s.whatsapp.hasPhone ? "لا رقم هاتف"
    : s.whatsapp.stopped ? "أوقف الرسائل التسويقية" + (s.whatsapp.at ? ` (${new Date(s.whatsapp.at).toLocaleDateString("ar", { timeZone: "Europe/Istanbul" })})` : "")
    : s.whatsapp.undeliverable > 0 ? `الرقم لا يستقبل واتساب (${s.whatsapp.undeliverable} محاولة فاشلة)`
    : s.whatsapp.optedIn ? "يستقبل" : "لم يوافق على الرسائل التسويقية";
  const em = !s.email.hasEmail ? "لا بريد" : s.email.suppressed ? EMAIL_REASON[s.email.suppressed] ?? "موقوف" : "يستقبل";
  return (
    <section className="rounded-xl border bg-white p-4" dir="rtl">
      <h3 className="mb-1 font-bold">حالة التواصل</h3>
      {s.doNotContact ? <p className="mb-1 rounded bg-red-50 px-2 py-1 text-sm font-semibold text-red-700">⛔ طلب المتبرع عدم التواصل نهائياً</p> : null}
      {line(s.whatsapp.hasPhone && s.whatsapp.optedIn && !s.whatsapp.stopped && s.whatsapp.undeliverable === 0, "واتساب", wa)}
      {line(s.email.hasEmail && !s.email.suppressed, "البريد", em)}
      <p className="mt-1 text-xs text-slate-500">الرسائل الخدمية (الإيصالات) تصل رغم إيقاف التسويق، إلا عند طلب عدم التواصل.</p>
    </section>
  );
}
