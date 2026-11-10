"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { validClarityId, validGtmId } from "@/lib/tracking/managed-tags";

type Locale = "ar" | "en" | "tr" | "fr" | "id" | "pt" | "es" | "de";
type LabelKey = "heading" | "description" | "project" | "container" | "enabled" | "save" | "saving" |
  "reload" | "configured" | "inactive" | "notConfigured" | "local" | "external" |
  "notVerified" | "legacy" | "persisted" | "error" | "saved" | "updated" | "view" | "caution";
const LABELS: Record<Locale, Record<LabelKey, string>> = {
  ar: {heading:"إدارة Clarity وGTM",description:"الإعدادات تُحفظ في قاعدة البيانات. لا تعني حالة الإعداد أن الاتصال الخارجي تم التحقق منه.",project:"معرّف مشروع Clarity",container:"معرّف حاوية GTM",enabled:"تفعيل السكربت على الموقع العام بعد الموافقة",save:"حفظ الإعدادات",saving:"جارٍ الحفظ",reload:"إعادة القراءة",configured:"مُهيأ ومفعّل",inactive:"معطّل",notConfigured:"غير مُهيأ",local:"التحميل في المتصفح",external:"الاتصال الخارجي",notVerified:"لم يتم التحقق",legacy:"موروث من الإعداد القديم",persisted:"محفوظ في قاعدة البيانات",error:"تعذّر إكمال الطلب",saved:"تم الحفظ",updated:"آخر تعديل",view:"فتح لوحة المزود",caution:"لا نرسل أحداث التبرعات إلى GTM. راجع إعدادات الحاوية قبل الاعتماد للتأكد من عدم تكرار GA4 أو purchase."},
  en: {heading:"Clarity and GTM",description:"Saved settings do not establish external connectivity.",project:"Clarity project ID",container:"GTM container ID",enabled:"Enable on the public site after consent",save:"Save settings",saving:"Saving",reload:"Reload",configured:"Configured and enabled",inactive:"Disabled",notConfigured:"Not configured",local:"Browser load",external:"External connection",notVerified:"Not verified",legacy:"Inherited legacy setting",persisted:"Saved in database",error:"Request failed",saved:"Saved",updated:"Last change",view:"Open provider",caution:"No donation events are pushed to GTM. Audit container tags before release to prevent GA4 or purchase duplicates."},
  tr: {heading:"Clarity ve GTM",description:"Kaydedilen ayarlar dış bağlantının doğrulandığı anlamına gelmez.",project:"Clarity proje kimliği",container:"GTM kapsayıcı kimliği",enabled:"Onay sonrası sitede etkinleştir",save:"Kaydet",saving:"Kaydediliyor",reload:"Yenile",configured:"Yapılandırılmış ve açık",inactive:"Kapalı",notConfigured:"Yapılandırılmamış",local:"Tarayıcı yüklemesi",external:"Dış bağlantı",notVerified:"Doğrulanmadı",legacy:"Eski ayardan aktarıldı",persisted:"Veritabanında kayıtlı",error:"İstek başarısız",saved:"Kaydedildi",updated:"Son değişiklik",view:"Sağlayıcıyı aç",caution:"GTM'ye bağış etkinliği gönderilmez. GA4 veya satın alma tekrarını önlemek için kapsayıcı etiketlerini denetleyin."},
  fr: {heading:"Clarity et GTM",description:"La configuration ne prouve pas une connexion externe.",project:"ID du projet Clarity",container:"ID du conteneur GTM",enabled:"Activer après consentement",save:"Enregistrer",saving:"Enregistrement",reload:"Recharger",configured:"Configuré et activé",inactive:"Désactivé",notConfigured:"Non configuré",local:"Chargement navigateur",external:"Connexion externe",notVerified:"Non vérifiée",legacy:"Réglage hérité",persisted:"Enregistré en base",error:"Échec de la requête",saved:"Enregistré",updated:"Dernière modification",view:"Ouvrir le fournisseur",caution:"Aucun événement de don transmis à GTM. Vérifier les balises pour éviter les doublons GA4/purchase."},
  id: {heading:"Clarity dan GTM",description:"Pengaturan tersimpan bukan bukti koneksi eksternal.",project:"ID proyek Clarity",container:"ID kontainer GTM",enabled:"Aktifkan setelah persetujuan",save:"Simpan",saving:"Menyimpan",reload:"Muat ulang",configured:"Aktif dan terkonfigurasi",inactive:"Nonaktif",notConfigured:"Belum diatur",local:"Pemuatan browser",external:"Koneksi eksternal",notVerified:"Belum diverifikasi",legacy:"Pengaturan lama",persisted:"Tersimpan di basis data",error:"Permintaan gagal",saved:"Tersimpan",updated:"Terakhir diubah",view:"Buka penyedia",caution:"Tidak ada peristiwa donasi yang dikirim ke GTM. Audit tag untuk mencegah duplikasi GA4/purchase."},
  pt: {heading:"Clarity e GTM",description:"Salvar não comprova conexão externa.",project:"ID do projeto Clarity",container:"ID do contêiner GTM",enabled:"Ativar após consentimento",save:"Salvar",saving:"Salvando",reload:"Recarregar",configured:"Configurado e ativo",inactive:"Desativado",notConfigured:"Não configurado",local:"Carregamento no navegador",external:"Conexão externa",notVerified:"Não verificado",legacy:"Configuração herdada",persisted:"Salvo no banco",error:"Falha na solicitação",saved:"Salvo",updated:"Última alteração",view:"Abrir provedor",caution:"Nenhum evento de doação é enviado ao GTM. Revise as tags para evitar duplicação do GA4/purchase."},
  es: {heading:"Clarity y GTM",description:"Guardar no demuestra conexión externa.",project:"ID del proyecto Clarity",container:"ID del contenedor GTM",enabled:"Activar después del consentimiento",save:"Guardar",saving:"Guardando",reload:"Recargar",configured:"Configurado y activo",inactive:"Desactivado",notConfigured:"Sin configurar",local:"Carga en navegador",external:"Conexión externa",notVerified:"No verificada",legacy:"Configuración heredada",persisted:"Guardado en base",error:"Solicitud fallida",saved:"Guardado",updated:"Último cambio",view:"Abrir proveedor",caution:"No se envían eventos de donación a GTM. Revisar las etiquetas para evitar duplicados GA4/purchase."},
  de: {heading:"Clarity und GTM",description:"Gespeicherte Einstellungen beweisen keine externe Verbindung.",project:"Clarity-Projekt-ID",container:"GTM-Container-ID",enabled:"Nach Zustimmung aktivieren",save:"Speichern",saving:"Speichern läuft",reload:"Neu laden",configured:"Eingerichtet und aktiv",inactive:"Deaktiviert",notConfigured:"Nicht eingerichtet",local:"Browser-Laden",external:"Externe Verbindung",notVerified:"Nicht geprüft",legacy:"Übernommene Einstellung",persisted:"In Datenbank gespeichert",error:"Anfrage fehlgeschlagen",saved:"Gespeichert",updated:"Letzte Änderung",view:"Anbieter öffnen",caution:"Keine Spendenereignisse werden an GTM übermittelt. Container-Tags auf doppelte GA4/purchase-Ereignisse prüfen."},
};
type Tag = { id: string | null; enabled: boolean; source: "legacy" | "database"; configured: boolean;
  lastChangedAt: string | null; lastExternalVerifiedAt: string | null };
type Settings = { clarity: Tag; gtm: Tag; connectionStatus: string };
const langs: Locale[] = ["ar","tr","en","fr","id","pt","es","de"];

export default function ManagedTagsEditor({ canManage }: { canManage: boolean }) {
  const [lang, setLang] = useState<Locale>("ar");
  const [data, setData] = useState<Settings | null>(null);
  const [form, setForm] = useState({ clarityProjectId: "", clarityEnabled: false, gtmContainerId: "", gtmEnabled: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const t = LABELS[lang];
  const rtl = lang === "ar";
  async function reload() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/admin/tracking/integrations", { cache: "no-store" });
      if (!r.ok) throw Error("read failed");
      const saved = await r.json() as Settings;
      setData(saved);
      setForm({ clarityProjectId: saved.clarity.id ?? "", clarityEnabled: saved.clarity.enabled,
        gtmContainerId: saved.gtm.id ?? "", gtmEnabled: saved.gtm.enabled });
    } catch { setMessage(t.error); }
    finally { setBusy(false); }
  }
  useEffect(() => { void reload(); /* initial mount only */ }, []);
  const invalidClarity = Boolean(form.clarityProjectId) && !validClarityId(form.clarityProjectId.trim());
  const invalidGtm = Boolean(form.gtmContainerId) && !validGtmId(form.gtmContainerId.trim().toUpperCase());
  const invalid = invalidClarity || invalidGtm ||
    (form.clarityEnabled && !form.clarityProjectId.trim()) ||
    (form.gtmEnabled && !form.gtmContainerId.trim());
  async function save() {
    if (invalid || !canManage) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/tracking/integrations", {
        method:"PUT", headers:{"content-type":"application/json"},
        body:JSON.stringify({
          clarityProjectId: form.clarityProjectId.trim() || null,
          clarityEnabled: form.clarityEnabled,
          gtmContainerId: form.gtmContainerId.trim() || null,
          gtmEnabled: form.gtmEnabled,
        }),
      });
      if (!res.ok) throw Error("save failed");
      const saved = await res.json() as Settings;
      setData(saved);
      setForm({ clarityProjectId: saved.clarity.id ?? "", clarityEnabled: saved.clarity.enabled,
        gtmContainerId: saved.gtm.id ?? "", gtmEnabled: saved.gtm.enabled });
      setMessage(t.saved);
    } catch { setMessage(t.error); }
    finally { setBusy(false); }
  }
  function card(kind: "clarity" | "gtm") {
    const isClarity = kind === "clarity";
    const name = isClarity ? "Microsoft Clarity" : "Google Tag Manager";
    const field = isClarity ? "clarityProjectId" : "gtmContainerId";
    const flag = isClarity ? "clarityEnabled" : "gtmEnabled";
    const value = form[field];
    const info = data?.[kind];
    const state = !value ? t.notConfigured : form[flag] ? t.configured : t.inactive;
    return (
      <section aria-label={name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h3 className="font-bold text-slate-900">{name}</h3>
            <p className="mt-1 text-xs text-slate-500">{state}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
            {info?.source === "legacy" ? t.legacy : t.persisted}
          </span>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          {isClarity ? t.project : t.container}
          <input aria-label={isClarity ? t.project : t.container} value={value}
            disabled={!canManage || busy} maxLength={32}
            onChange={e=>setForm(x=>({...x,[field]:e.target.value}))}
            placeholder={isClarity?"u614k028k2":"GTM-XXXXXXX"}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-offset-2 disabled:bg-slate-50" />
        </label>
        {((isClarity && invalidClarity) || (!isClarity && invalidGtm)) &&
          <p role="alert" className="mt-1 text-xs text-red-700">{t.error}: {isClarity?"a-z, 0-9 (6–20)":"GTM-XXXX (A-Z, 0-9)"}</p>}
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form[flag]} disabled={!canManage || busy}
            onChange={e=>setForm(x=>({...x,[flag]:e.target.checked}))}
            className="h-4 w-4 rounded border" />
          <span>{t.enabled}</span>
        </label>
        <dl className="mt-4 grid gap-2 border-t pt-3 text-xs text-slate-600 sm:grid-cols-2">
          <div><dt className="font-semibold">{t.local}</dt><dd>{t.notVerified}</dd></div>
          <div><dt className="font-semibold">{t.external}</dt><dd>{t.notVerified}</dd></div>
          <div className="sm:col-span-2"><dt className="font-semibold">{t.updated}</dt><dd>{info?.lastChangedAt ? new Date(info.lastChangedAt).toLocaleString(lang) : "—"}</dd></div>
        </dl>
        {value && (isClarity ? validClarityId(value) : validGtmId(value.toUpperCase())) &&
          <a href={isClarity ? `https://clarity.microsoft.com/projects/view/${encodeURIComponent(value)}/dashboard`
              : "https://tagmanager.google.com/#/home"} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex text-xs font-semibold text-blue-700 underline">{t.view}</a>}
      </section>
    );
  }
  return (
    <section className="space-y-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold text-slate-900">{t.heading}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.description}</p></div>
        <select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as Locale)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {langs.map(x=><option key={x} value={x}>{x.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{card("clarity")}{card("gtm")}</div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-6 text-amber-900">
        {t.caution} <Link href="/dashboard/pixels" className="underline">Pixels / GA4</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {canManage && <button type="button" disabled={busy || invalid || !data} onClick={()=>void save()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? t.saving : t.save}
        </button>}
        <button type="button" disabled={busy} onClick={()=>void reload()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">{t.reload}</button>
        <span role="status" className="text-sm text-slate-600">{message}</span>
      </div>
    </section>
  );
}
