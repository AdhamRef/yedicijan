"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORTED_LOCALES } from "@/lib/locales";

type Donor = { id: string; name: string | null; email: string | null; preferredLang?: string | null };
type Segment = { id: string; name: string; membersCount: number; channels: string[]; updatedAt: string };

export function DonorSegmentsClient() {
  const [lists, setLists] = useState<Segment[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editList, setEditList] = useState<{ id: string; name: string } | null>(null);
  const [activeList, setActiveList] = useState<{ id: string; members: Donor[] } | null>(null);

  async function refreshLists() {
    const response = await fetch("/api/admin/donor-segments", { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل القوائم");
    const data = await response.json();
    setLists(Array.isArray(data.lists) ? data.lists : []);
  }

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ scope: "donors", page: "1", limit: "25", search });
        const response = await fetch("/api/users?" + params, { cache: "no-store" });
        if (!response.ok) throw new Error("تعذر تحميل المتبرعين");
        const json = await response.json();
        if (!cancelled) setDonors(Array.isArray(json.users) ? json.users : []);
      } catch {
        if (!cancelled) setMessage("تعذر تحميل المتبرعين. حاول مرة أخرى.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  useEffect(() => {
    refreshLists().catch(() => setMessage("تعذر تحميل القوائم."));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 100 ? [...prev, id] : prev);
  }

  async function create() {
    if (!name.trim() || selected.length === 0 || busy) {
      setMessage("اختر متبرعًا واحدًا على الأقل واكتب اسم القائمة.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/donor-segments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, channel, donorIds: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "فشل إنشاء القائمة");
      setName("");
      setDescription("");
      setSelected([]);
      setMessage("تم حفظ القائمة بنجاح. لم تُرسل أي رسائل.");
      await refreshLists();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل إنشاء القائمة");
    } finally {
      setBusy(false);
    }
  }


  async function renameList() {
    if (!editList?.name.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/donor-segments/" + editList.id, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editList.name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تعديل الاسم");
      setEditList(null);
      setMessage("تم تعديل اسم القائمة");
      await refreshLists();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تعديل الاسم");
    } finally {
      setBusy(false);
    }
  }

  async function viewMembers(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/donor-segments/" + id, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر عرض الأعضاء");
      setActiveList({ id, members: Array.isArray(data.members) ? data.members : [] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر عرض الأعضاء");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <Link href="/dashboard/users/donors" className="text-sm underline">العودة إلى المتبرعين</Link>
        <h1 className="text-2xl font-semibold">قوائم المتبرعين</h1>
        <p className="text-sm text-muted-foreground">أنشئ قائمة قابلة للاستخدام لاحقًا في حملات البريد أو واتساب، دون إرسال أي رسائل الآن.</p>
      </header>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">قائمة جديدة</h2>
        <label className="block text-sm">اسم القائمة
          <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="مثال: متبرعو مشروع الشتاء" />
        </label>
        <label className="block text-sm">الوصف
          <Input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="وصف اختياري" />
        </label>
        <label className="block text-sm">القناة المستهدفة
          <select className="mt-1 block w-full rounded-md border p-2" value={channel} onChange={(e) => setChannel(e.target.value as "EMAIL" | "WHATSAPP")}>
            <option value="EMAIL">البريد الإلكتروني</option>
            <option value="WHATSAPP">واتساب</option>
          </select>
        </label>
        <label className="block text-sm">البحث عن متبرعين
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الاسم أو البريد الإلكتروني" />
        </label>
        <p className="text-sm text-muted-foreground">تم اختيار {selected.length} متبرعًا. الحد الأقصى 100 في القائمة الواحدة. تظهر أول 25 نتيجة للبحث الحالي.</p>

        {loading ? <p role="status">جاري تحميل المتبرعين…</p> : donors.length === 0 ? (
          <p className="rounded-md bg-muted p-4">لا توجد نتائج مطابقة.</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-md border">
            {donors.map((d) => (
              <label key={d.id} className="flex items-center gap-3 border-b p-3 text-sm last:border-b-0">
                <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />
                <span className="min-w-0 flex-1 truncate">{d.name || "متبرع دون اسم"} — {d.email || "دون بريد"}</span>
                <span className="text-muted-foreground">{SUPPORTED_LOCALES.includes(d.preferredLang as never) ? d.preferredLang : "ar"}</span>
              </label>
            ))}
          </div>
        )}
        <Button disabled={busy || !name.trim() || selected.length === 0} onClick={create}>
          {busy ? "جاري الحفظ…" : "إنشاء قائمة المتبرعين"}
        </Button>
        {message && <p role="status" className="rounded-md bg-muted p-3 text-sm">{message}</p>}
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">القوائم المحفوظة</h2>
        {lists.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد قوائم محفوظة حتى الآن.</p> : (
          <div className="divide-y">
            {lists.map((list) => (
              <div key={list.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium">{list.name}</span>
                <span className="text-sm text-muted-foreground">{list.membersCount} متبرع · {list.channels.join("، ")}</span>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => viewMembers(list.id)}>عرض الأعضاء</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditList({ id: list.id, name: list.name })}>تعديل الاسم</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {editList && (
        <section className="rounded-xl border p-4">
          <h2 className="font-medium">تعديل اسم القائمة</h2>
          <label className="block text-sm">اسم القائمة
            <Input value={editList.name} maxLength={100}
              onChange={(e) => setEditList((prev) => prev && { ...prev, name: e.target.value })} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button disabled={busy || !editList.name.trim()} onClick={renameList}>حفظ</Button>
            <Button variant="outline" onClick={() => setEditList(null)}>إلغاء</Button>
          </div>
        </section>
      )}
      {activeList && (
        <section className="space-y-2 rounded-xl border p-4">
          <div className="flex justify-between">
            <h2 className="font-medium">أعضاء القائمة</h2>
            <Button size="sm" variant="outline" onClick={() => setActiveList(null)}>إغلاق</Button>
          </div>
          {activeList.members.length === 0 ? <p className="text-sm">لا يوجد متبرعون في هذه القائمة.</p>
            : <div className="max-h-80 divide-y overflow-auto">
              {activeList.members.map((m) => <p key={m.id} className="py-2 text-sm">{m.name || "متبرع"} — {m.email || "دون بريد"}</p>)}
            </div>}
        </section>
      )}
    </main>
  );
}
