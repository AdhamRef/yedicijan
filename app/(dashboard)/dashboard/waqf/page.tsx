"use client";

/**
 * /dashboard/waqf — the public /waqf page's funds and settings.
 * Funds: add, edit (texts in the site's eight languages, image, kind, share price, linked
 * projects, badge, progress), hide, reorder, delete. Settings: hero and story images, the share
 * price, quick share counts, and whether designated waqf is offered.
 * Donations are unchanged: a fund's shares go through the existing dialog to one of its projects.
 */
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  ArrowDown, ArrowUp, Check, Eye, EyeOff, ImagePlus, Infinity as InfinityIcon, Loader2, Pencil, Plus, Save, Search, Sparkles, Trash2, X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/dashboard/client-error-message";
import { validateImageFile } from "@/lib/uploads/image-file-rules";
import { FUND_KINDS, WAQF_MIN_SHARE_USD, type FundKind, type FundTexts, type WaqfFundDTO, type WaqfSettingsDTO } from "@/lib/waqf/config";

const LOCALES = [
  ["ar", "العربية"], ["en", "English"], ["tr", "Türkçe"], ["fr", "Français"],
  ["de", "Deutsch"], ["es", "Español"], ["id", "Indonesia"], ["pt", "Português"],
] as const;
const KIND_LABEL: Record<FundKind, string> = {
  water: "سقيا الماء (آبار)", mosques: "بيوت الله (مساجد)", education: "التعليم (مدارس)", housing: "المأوى (منازل)",
  energy: "الطاقة الشمسية", orphans: "الأيتام", general: "عام",
};

type Campaign = { id: string; title: string; images?: string[]; targetAmount?: number; currentAmount?: number };
type Draft = Omit<WaqfFundDTO, "id" | "order"> & { id?: string };

const emptyDraft = (): Draft => ({ kind: "general", isActive: true, featured: false, image: null, shareUSD: null, campaignIds: [], showProgress: false, texts: {} });
const plain = (s: string) => s.replace(/\*\*/g, "");

async function uploadImage(file: File): Promise<string | null> {
  const rejection = validateImageFile(file);
  if (rejection) {
    toast.error(rejection);
    return null;
  }
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await axios.post("/api/upload", fd);
    toast.success("تم رفع الصورة");
    return res.data.url as string;
  } catch (err) {
    toast.error(errorMessage(err, "فشل رفع الصورة"));
    return null;
  }
}

function ImageField({ label, value, onChange, hint }: { label: string; value: string | null; onChange: (v: string | null) => void; hint?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploads live on Cloudinary */}
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="px-4 text-center text-xs text-muted-foreground">{hint ?? "بدون صورة — تُستخدم صورة تلقائية"}</span>}
        {value && (
          <button type="button" onClick={() => onChange(null)} className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" aria-label="إزالة الصورة"><X className="h-4 w-4" /></button>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {value ? "تغيير الصورة" : "رفع صورة"}
        <input type="file" accept="image/*" className="hidden" disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            const url = await uploadImage(f);
            setBusy(false);
            if (url) onChange(url);
          }} />
      </label>
    </div>
  );
}

export default function WaqfDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<WaqfSettingsDTO | null>(null);
  const [funds, setFunds] = useState<WaqfFundDTO[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savingFund, setSavingFund] = useState(false);
  const [tab, setTab] = useState<string>("ar");
  const [pickQuery, setPickQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [chipsText, setChipsText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [admin, camps] = await Promise.all([
        axios.get("/api/waqf/admin"),
        axios.get("/api/campaigns", { params: { locale: "ar", limit: 100 } }).catch(() => ({ data: { items: [] } })),
      ]);
      setSettings(admin.data.settings);
      setChipsText((admin.data.settings.quickShares ?? []).join("، "));
      setFunds(admin.data.funds);
      setCampaigns(camps.data.items ?? []);
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر تحميل الصناديق"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const quickShares = chipsText.split(/[,،\s]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0);
      const res = await axios.put("/api/waqf/settings", { ...settings, quickShares });
      setSettings(res.data.settings);
      setChipsText(res.data.settings.quickShares.join("، "));
      toast.success("تم حفظ إعدادات الصفحة");
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر الحفظ"));
    } finally {
      setSavingSettings(false);
    }
  };

  const saveFund = async () => {
    if (!draft) return;
    if (!draft.texts.ar?.name?.trim()) {
      setTab("ar");
      toast.error("اسم الصندوق بالعربية مطلوب");
      return;
    }
    setSavingFund(true);
    try {
      if (draft.id) {
        const res = await axios.put(`/api/waqf/funds/${draft.id}`, draft);
        setFunds((fs) => fs.map((f) => (f.id === draft.id ? res.data.fund : f)));
      } else {
        const res = await axios.post("/api/waqf/funds", draft);
        setFunds((fs) => [...fs, res.data.fund]);
      }
      toast.success("تم حفظ الصندوق");
      setDraft(null);
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر حفظ الصندوق"));
    } finally {
      setSavingFund(false);
    }
  };

  const quickToggle = async (f: WaqfFundDTO, patch: Partial<WaqfFundDTO>) => {
    const next = { ...f, ...patch };
    setFunds((fs) => fs.map((x) => (x.id === f.id ? next : x)));
    try {
      await axios.put(`/api/waqf/funds/${f.id}`, next);
    } catch (err) {
      setFunds((fs) => fs.map((x) => (x.id === f.id ? f : x)));
      toast.error(errorMessage(err, "تعذّر التحديث"));
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= funds.length) return;
    const next = [...funds];
    [next[i], next[j]] = [next[j], next[i]];
    setFunds(next);
    try {
      await axios.post("/api/waqf/funds/reorder", { ids: next.map((f) => f.id) });
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر حفظ الترتيب"));
      load();
    }
  };

  const remove = async (id: string) => {
    try {
      await axios.delete(`/api/waqf/funds/${id}`);
      setFunds((fs) => fs.filter((f) => f.id !== id));
      toast.success("تم حذف الصندوق");
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر الحذف"));
    } finally {
      setConfirmDelete(null);
    }
  };

  const seed = async () => {
    try {
      await axios.post("/api/waqf/funds/seed");
      toast.success("أُضيفت الصناديق الستة — عدّلها كما تريد");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "تعذّر الإضافة"));
    }
  };

  const setText = (loc: string, key: "name" | "description" | "badge", v: string) =>
    setDraft((d) => {
      if (!d) return d;
      const cur = d.texts[loc as keyof FundTexts] ?? { name: "", description: "", badge: "" };
      return { ...d, texts: { ...d.texts, [loc]: { ...cur, [key]: v } } };
    });

  const filteredCampaigns = campaigns.filter((c) => plain(c.title).includes(pickQuery.trim()));

  if (loading || !settings) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="الصناديق الوقفية"
        description="صناديق صفحة الأوقاف وصورها ونصوصها بكل اللغات، وإعدادات الصفحة"
        icon={InfinityIcon}
        actions={
          <Button onClick={() => { setTab("ar"); setPickQuery(""); setDraft(emptyDraft()); }} className="gap-2">
            <Plus className="h-4 w-4" />إضافة صندوق
          </Button>
        }
      />

      {/* ── Funds ── */}
      <Card>
        <CardHeader>
          <CardTitle>الصناديق</CardTitle>
          <CardDescription>
            تظهر تحت «وقف عام» بهذا الترتيب. أسهم كل صندوق تُصرف في مشروعه المرتبط الأكثر احتياجاً؛ وإن لم تربط مشاريع يختار الموقع مشاريع نوعه تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funds.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
              <p className="max-w-md text-sm text-muted-foreground">لا توجد صناديق محفوظة بعد، والصفحة تعرض الصناديق الستة الافتراضية. أضفها هنا لتعدّلها، أو أنشئ صندوقاً جديداً.</p>
              <Button variant="outline" onClick={seed} className="gap-2"><Sparkles className="h-4 w-4" />إضافة الصناديق الستة الافتراضية</Button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {funds.map((f, i) => {
                const linked = f.campaignIds.map((id) => byId.get(id)).filter(Boolean) as Campaign[];
                const img = f.image ?? linked[0]?.images?.[0] ?? null;
                return (
                  <li key={f.id} className={`overflow-hidden rounded-xl border bg-card ${f.isActive ? "" : "opacity-60"}`}>
                    <div className="relative aspect-[16/9] bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element -- uploads live on Cloudinary */}
                      {img ? <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-muted-foreground">صورة تلقائية من مشروع الصندوق</span>}
                      <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">{KIND_LABEL[f.kind]}</span>
                      {f.featured && <span className="absolute end-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-black">{f.texts.ar?.badge || "مميّز"}</span>}
                    </div>
                    <div className="space-y-1 p-3">
                      <b className="block">{f.texts.ar?.name || "—"}</b>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{f.texts.ar?.description}</p>
                      <p className="text-xs">سعر السهم: <b>${f.shareUSD ?? settings.shareUSD}</b> · مشاريع مرتبطة: <b>{linked.length || "تلقائي"}</b></p>
                      <div className="flex flex-wrap items-center gap-1 pt-2">
                        <Button size="sm" variant="outline" onClick={() => { setTab("ar"); setPickQuery(""); setDraft({ ...f }); }} className="gap-1"><Pencil className="h-3.5 w-3.5" />تعديل</Button>
                        <Button size="sm" variant="ghost" onClick={() => quickToggle(f, { isActive: !f.isActive })} title={f.isActive ? "إخفاء" : "إظهار"}>{f.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                        <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} title="للأعلى"><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" disabled={i === funds.length - 1} onClick={() => move(i, 1)} title="للأسفل"><ArrowDown className="h-4 w-4" /></Button>
                        {confirmDelete === f.id ? (
                          <>
                            <Button size="sm" variant="destructive" onClick={() => remove(f.id)}>تأكيد الحذف</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(f.id)} title="حذف"><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Page settings ── */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الصفحة</CardTitle>
          <CardDescription>صور الصفحة وسعر السهم وخيارات الوقف.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ImageField label="صورة الهيرو" value={settings.heroImage} onChange={(v) => setSettings({ ...settings, heroImage: v })} hint="بدون صورة — تُستخدم صورة أحد المشاريع" />
            <ImageField label="صورة قصة بئر رومة" value={settings.storyImage} onChange={(v) => setSettings({ ...settings, storyImage: v })} hint="بدون صورة — تُستخدم صورة مشروع بئر" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="w-share">سعر السهم في الصناديق (دولار)</Label>
              <Input id="w-share" type="number" min={WAQF_MIN_SHARE_USD} value={settings.shareUSD}
                onChange={(e) => setSettings({ ...settings, shareUSD: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">لا يقل عن {WAQF_MIN_SHARE_USD} دولار. يمكن لكل صندوق سعر خاص.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-chips">أعداد الأسهم السريعة</Label>
              <Input id="w-chips" value={chipsText} onChange={(e) => setChipsText(e.target.value)} placeholder="1، 3، 5، 10" />
              <p className="text-xs text-muted-foreground">أزرار تظهر فوق − و+ في لوحة «وقفك» (حتى 6).</p>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
              <div>
                <Label>إظهار «وقف مخصّص»</Label>
                <p className="text-xs text-muted-foreground">يختار المتبرع المشروع بنفسه.</p>
              </div>
              <Switch checked={settings.showDesignated} onCheckedChange={(v) => setSettings({ ...settings, showDesignated: v })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={savingSettings} className="gap-2">
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ الإعدادات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Fund editor ── */}
      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "تعديل صندوق" : "صندوق جديد"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <ImageField label="صورة الصندوق" value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} hint="بدون صورة — تُستخدم صورة مشروع الصندوق" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="f-kind">نوع الصندوق</Label>
                    <select id="f-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as FundKind })}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      {FUND_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground">يحدد الأيقونة، والمشاريع التي يختارها الموقع تلقائياً إن لم تربط مشاريع.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="f-share">سعر السهم (دولار)</Label>
                    <Input id="f-share" type="number" min={WAQF_MIN_SHARE_USD} placeholder={`سعر الصفحة: ${settings.shareUSD}`}
                      value={draft.shareUSD ?? ""} onChange={(e) => setDraft({ ...draft, shareUSD: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  {([
                    ["isActive", "ظاهر في الصفحة"],
                    ["featured", "مميّز (شارة على البطاقة)"],
                    ["showProgress", "إظهار نسبة الإنجاز من المشاريع المرتبطة"],
                  ] as const).map(([k, l]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <Label>{l}</Label>
                      <Switch checked={Boolean(draft[k])} onCheckedChange={(v) => setDraft({ ...draft, [k]: v })} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                  {LOCALES.map(([loc, label]) => (
                    <button key={loc} type="button" onClick={() => setTab(loc)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === loc ? "bg-background shadow" : "text-muted-foreground"}`}>
                      {label}{draft.texts[loc]?.name ? <Check className="ms-1 inline h-3 w-3 text-emerald-600" /> : null}
                    </button>
                  ))}
                </div>
                <div className="space-y-3" dir={tab === "ar" ? "rtl" : "ltr"}>
                  <div className="space-y-1.5">
                    <Label>اسم الصندوق {tab === "ar" && <span className="text-destructive">*</span>}</Label>
                    <Input value={draft.texts[tab as keyof FundTexts]?.name ?? ""} maxLength={80} onChange={(e) => setText(tab, "name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>وصف قصير</Label>
                    <Textarea rows={2} maxLength={240} value={draft.texts[tab as keyof FundTexts]?.description ?? ""} onChange={(e) => setText(tab, "description", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>نص الشارة (للصندوق المميّز)</Label>
                    <Input maxLength={40} placeholder={tab === "ar" ? "مثال: الأكثر احتياجاً" : ""} value={draft.texts[tab as keyof FundTexts]?.badge ?? ""} onChange={(e) => setText(tab, "badge", e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground">اللغة التي تُترك فارغة تظهر بالنص الافتراضي لنوع الصندوق.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>المشاريع التي تُصرف فيها أسهم الصندوق ({draft.campaignIds.length})</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="ps-9" placeholder="ابحث في المشاريع" value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} />
                </div>
                <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {filteredCampaigns.map((c) => {
                    const on = draft.campaignIds.includes(c.id);
                    return (
                      <li key={c.id}>
                        <button type="button" onClick={() => setDraft({ ...draft, campaignIds: on ? draft.campaignIds.filter((x) => x !== c.id) : [...draft.campaignIds, c.id] })}
                          className={`flex w-full items-center gap-3 rounded-lg p-1.5 text-start text-sm ${on ? "bg-primary/10" : "hover:bg-muted"}`}>
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                          {/* eslint-disable-next-line @next/next/no-img-element -- uploads live on Cloudinary */}
                          {c.images?.[0] && <img src={c.images[0]} alt="" className="h-9 w-12 rounded object-cover" />}
                          <span className="line-clamp-1">{plain(c.title)}</span>
                        </button>
                      </li>
                    );
                  })}
                  {filteredCampaigns.length === 0 && <li className="p-3 text-center text-xs text-muted-foreground">لا توجد مشاريع</li>}
                </ul>
                <p className="text-xs text-muted-foreground">بدون اختيار: يختار الموقع مشاريع نوع الصندوق تلقائياً.</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDraft(null)}>إلغاء</Button>
            <Button onClick={saveFund} disabled={savingFund} className="gap-2">
              {savingFund ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ الصندوق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
