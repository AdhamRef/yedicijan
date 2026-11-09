"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/lib/locales";

type Translation = { locale: string; title: string; description: string | null; ctaLabel: string | null };
type Banner = {
  id: string; title: string; description: string | null; ctaLabel: string;
  campaignId: string; imageUrl: string | null; priority: number;
  startsAt: string | null; endsAt: string | null; isActive: boolean;
  translations: Translation[];
};
type Campaign = { id: string; title: string; isActive?: boolean };

const initialForm = () => ({
  title: "", description: "", ctaLabel: "ساهم الآن", campaignId: "",
  imageUrl: "", priority: 0, translations: {} as Record<string, { title: string; description: string; ctaLabel: string }>,
});

export function UrgentBannersClient() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [bannerResult, campaignsResult] = await Promise.all([
      fetch("/api/admin/urgent-banners", { cache: "no-store" }),
      fetch("/api/campaigns?limit=100&sortBy=priority&locale=ar", { cache: "no-store" }),
    ]);
    if (!bannerResult.ok) throw new Error("تعذّر تحميل البنرات");
    const banners = await bannerResult.json();
    const projects = campaignsResult.ok ? await campaignsResult.json() : { items: [] };
    setRows(Array.isArray(banners.items) ? banners.items : []);
    setCampaigns(Array.isArray(projects.items) ? projects.items : []);
  };
  useEffect(() => {
    load().catch(() => setMessage("تعذّر تحميل البيانات")).finally(() => setLoading(false));
  }, []);

  function startEdit(row: Banner) {
    setEditingId(row.id);
    setForm({
      title: row.title, description: row.description || "",
      ctaLabel: row.ctaLabel || "ساهم الآن", campaignId: row.campaignId,
      imageUrl: row.imageUrl || "", priority: row.priority,
      translations: Object.fromEntries(row.translations.map((t) =>
        [t.locale, { title: t.title, description: t.description || "", ctaLabel: t.ctaLabel || "ساهم الآن" }])
      ),
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save() {
    if (busy || !form.title.trim() || !form.campaignId) {
      setMessage("العنوان بالعربية والمشروع مطلوبان");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const translations = Object.fromEntries(Object.entries(form.translations)
        .filter(([locale, value]) => locale !== "ar" && SUPPORTED_LOCALES.includes(locale as never) && value.title.trim())
        .map(([locale, value]) => [locale, value]));
      const payload = {
        title: form.title, description: form.description,
        ctaLabel: form.ctaLabel, campaignId: form.campaignId,
        imageUrl: form.imageUrl || null, priority: Number(form.priority),
        translations,
      };
      const endpoint = editingId ? "/api/admin/urgent-banners/" + editingId : "/api/admin/urgent-banners";
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر الحفظ");
      setMessage(editingId ? "تم حفظ التعديلات" : "تم إنشاء البانر بحالة غير مفعّلة");
      setEditingId(null);
      setForm(initialForm());
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row: Banner) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/urgent-banners/" + row.id, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر تغيير الحالة");
      await load();
      setMessage(row.isActive ? "تم إيقاف البانر" : "تم تفعيل البانر للغات التي لها محتوى فقط");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تغيير الحالة");
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, key: "title" | "description" | "ctaLabel" | "imageUrl") => (
    <label className="block text-sm">{label}
      <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
    </label>
  );

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">البنرات العاجلة — يدي جيهان</h1>
        <p className="text-sm text-muted-foreground">إدارة بنرات الصفحة الرئيسية المرتبطة بمشاريع يدي جيهان. إنشاء البانر لا ينشره تلقائيًا.</p>
      </header>
      <section className="space-y-4 rounded-xl border p-4">
        <h2 className="font-semibold">{editingId ? "تحرير البانر" : "إضافة بانر جديد"}</h2>
        {field("العنوان بالعربية", "title")}
        {field("الوصف بالعربية", "description")}
        {field("نص الزر بالعربية", "ctaLabel")}
        {field("رابط صورة HTTPS (اختياري)", "imageUrl")}
        <label className="block text-sm">المشروع المرتبط
          <select className="mt-1 block w-full rounded-md border p-2" value={form.campaignId}
            onChange={(e) => setForm((p) => ({ ...p, campaignId: e.target.value }))}>
            <option value="">اختر مشروعًا</option>
            {campaigns.filter((c) => c.isActive !== false).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
        <label className="block text-sm">الأولوية
          <Input type="number" min={0} max={10000} value={form.priority}
            onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))} />
        </label>
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">ترجمات اللغات المفعّلة فقط</h3>
          <p className="text-xs text-muted-foreground">لا يظهر البانر في لغة أخرى ما لم يُكتب عنوانها. لا تُضاف أي لغات جديدة.</p>
          {SUPPORTED_LOCALES.filter((l) => l !== "ar").map((locale) => {
            const t = form.translations[locale] || { title: "", description: "", ctaLabel: "ساهم الآن" };
            return <div key={locale} className="space-y-2 rounded-lg border p-3">
              <h4 className="text-sm font-medium">{LOCALE_LABELS[locale]}</h4>
              {(["title", "description", "ctaLabel"] as const).map((k) =>
                <label key={k} className="block text-xs">{k === "title" ? "العنوان" : k === "description" ? "الوصف" : "نص الزر"}
                  <Input value={t[k]} onChange={(e) => setForm((p) => ({
                    ...p, translations: { ...p.translations, [locale]: { ...t, [k]: e.target.value } },
                  }))} />
                </label>)}
            </div>;
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={save}>{busy ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إنشاء بنار غير مفعّل"}</Button>
          {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(initialForm()); }}>إلغاء التعديل</Button>}
        </div>
        {message && <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p>}
      </section>
      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">البنرات المحفوظة</h2>
        {loading ? <p>جاري التحميل…</p> : rows.length === 0 ? <p>لا توجد بنرات بعد.</p> :
          <div className="divide-y">
            {rows.map((b) => <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.isActive ? "مفعّل" : "غير مفعّل"} · الأولوية {b.priority} · {b.translations.length + 1} لغات</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(b)}>تحرير</Button>
                <Button size="sm" disabled={busy} onClick={() => toggle(b)}>{b.isActive ? "إيقاف" : "تفعيل"}</Button>
              </div>
            </div>)}
          </div>}
      </section>
    </main>
  );
}
