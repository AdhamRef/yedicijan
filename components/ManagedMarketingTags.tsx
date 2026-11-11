"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Clarity from "@microsoft/clarity";
import { readTrackingConsent, saveTrackingConsent, trackingSensitivePath } from "@/lib/tracking/consent";
import { shouldLoadManagedTag, validClarityId, validGtmId, type ManagedTag } from "@/lib/tracking/managed-tags";

/**
 * No browser marketing script runs without an affirmative consent cookie.
 * No donor identifiers, basket contents, payment events or form values are
 * passed to either tool. Existing GA4/Ads event ownership is unchanged.
 */
type Consent = "granted" | "denied" | null;
type Locale = "ar" | "en" | "tr" | "fr" | "id" | "pt" | "es" | "de";
const COPY: Record<Locale, { title: string; body: string; accept: string; reject: string; change: string; close: string }> = {
  ar: { title: "خصوصية التحليلات", body: "هل توافق على استخدام Clarity وGoogle Tag Manager لتحسين الموقع؟ لا نرسل بيانات التبرع أو الدفع إلى هذه الأدوات مباشرة.", accept: "أوافق", reject: "رفض", change: "خصوصية التتبع", close: "إغلاق" },
  en: { title: "Analytics privacy", body: "Allow Clarity and Google Tag Manager for site analytics? We do not directly send donation or payment details to these tools.", accept: "Allow", reject: "Decline", change: "Tracking privacy", close: "Close" },
  tr: { title: "Analiz gizliliği", body: "Site analizi için Clarity ve Google Tag Manager kullanımına izin veriyor musunuz? Bağış veya ödeme bilgilerini doğrudan bu araçlara göndermiyoruz.", accept: "İzin ver", reject: "Reddet", change: "İzleme gizliliği", close: "Kapat" },
  fr: { title: "Confidentialité", body: "Autorisez-vous Clarity et Google Tag Manager pour les analyses du site ? Aucune donnée de don ou de paiement n'est transmise directement.", accept: "Autoriser", reject: "Refuser", change: "Confidentialité", close: "Fermer" },
  id: { title: "Privasi analitik", body: "Izinkan Clarity dan Google Tag Manager untuk analitik situs? Data donasi dan pembayaran tidak dikirim langsung.", accept: "Izinkan", reject: "Tolak", change: "Privasi pelacakan", close: "Tutup" },
  pt: { title: "Privacidade analítica", body: "Permitir Clarity e Google Tag Manager para analisar o site? Não enviamos diretamente dados de doações ou pagamentos.", accept: "Permitir", reject: "Recusar", change: "Privacidade", close: "Fechar" },
  es: { title: "Privacidad analítica", body: "¿Permitir Clarity y Google Tag Manager para analizar el sitio? No enviamos directamente datos de donaciones ni pagos.", accept: "Permitir", reject: "Rechazar", change: "Privacidad", close: "Cerrar" },
  de: { title: "Analyse-Datenschutz", body: "Clarity und Google Tag Manager zur Website-Analyse erlauben? Spenden- oder Zahlungsdaten werden nicht direkt übermittelt.", accept: "Erlauben", reject: "Ablehnen", change: "Tracking-Datenschutz", close: "Schließen" },
};
type PublicTags = {
  clarityProjectId: string | null; clarityEnabled: boolean;
  gtmContainerId: string | null; gtmEnabled: boolean;
};
type TagWindow = Window & {
  __yediClarityProject?: string;
  __yediGtmContainer?: string;
  clarity?: (...args: unknown[]) => void;
  yediGtmLayer?: Record<string, unknown>[];
};
function ensureGtm(id: string): void {
  const w = window as TagWindow;
  if (w.__yediGtmContainer) return;
  const already = Array.from(document.scripts).some(script => {
    try {
      const url = new URL(script.src);
      return url.hostname === "www.googletagmanager.com" &&
        url.pathname === "/gtm.js" && url.searchParams.get("id") === id;
    } catch { return false; }
  });
  w.__yediGtmContainer = id;
  if (already) return;
  // This isolated layer intentionally receives NO donation, purchase,
  // email, phone or transaction payload. Existing GA4/Ads use dataLayer.
  // Tag configuration in the external container still needs a separate
  // audit to prove it has no automatic duplicate purchase/pageview tags.
  w.yediGtmLayer = w.yediGtmLayer || [];
  w.yediGtmLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.dataset.yediManagedTag = "gtm";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}&l=yediGtmLayer`;
  document.head.appendChild(script);
}
function ensureClarity(id: string): void {
  const w = window as TagWindow;
  if (w.__yediClarityProject) return;
  // Microsoft Clarity masks content marked with data-clarity-mask; apply
  // it to the whole page BEFORE the SDK starts recording any DOM.
  document.body.setAttribute("data-clarity-mask", "");
  w.__yediClarityProject = id;
  try {
    Clarity.init(id);
    w.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  } catch {
    delete w.__yediClarityProject;
  }
}
export default function ManagedMarketingTags() {
  const pathname = usePathname() || "/";
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState<PublicTags | null>(null);
  const code = pathname.split("/")[1] as Locale;
  const locale = code in COPY ? code : "ar";
  const t = COPY[locale];
  const isRestricted = trackingSensitivePath(pathname);

  useEffect(() => {
    setConsent(readTrackingConsent());
    setReady(true);
    if (trackingSensitivePath(window.location.pathname)) return;
    const controller = new AbortController();
    fetch("/api/tracking/config", { cache: "no-store", signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setTags(data as PublicTags); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Client-side navigation does not unload already injected third-party SDKs.
  // A hard reload on entry into a sensitive route resets the document and
  // prevents replay tools and legacy pixels from continuing across SPA routes.
  useEffect(() => {
    if (!isRestricted) return;
    const w = window as TagWindow & { fbq?: unknown; gtag?: unknown; ttq?: unknown; twq?: unknown };
    if (w.__yediClarityProject || w.__yediGtmContainer ||
        w.fbq || w.gtag || w.ttq || w.twq) {
      window.location.reload();
    }
  }, [isRestricted]);

  useEffect(() => {
    if (isRestricted || consent !== "granted" || !tags) return;
    const clarity: ManagedTag = { id: tags.clarityProjectId, enabled: tags.clarityEnabled, source: "database" };
    const gtm: ManagedTag = { id: tags.gtmContainerId, enabled: tags.gtmEnabled, source: "database" };
    if (shouldLoadManagedTag(clarity, consent) && validClarityId(clarity.id)) ensureClarity(clarity.id);
    if (shouldLoadManagedTag(gtm, consent) && validGtmId(gtm.id)) ensureGtm(gtm.id);
  }, [consent, tags, isRestricted]);

  function choose(value: Exclude<Consent, null>) {
    saveTrackingConsent(value);
    const current = window as TagWindow & { fbq?: unknown; gtag?: unknown; ttq?: unknown; twq?: unknown };
    const loaded = Boolean(current.__yediClarityProject || current.__yediGtmContainer ||
      current.fbq || current.gtag || current.ttq || current.twq);
    if (value === "denied" && loaded) {
      (window as TagWindow).clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
      window.location.reload(); // only reliable way to unload an already-injected GTM runtime
      return;
    }
    setConsent(value);
    setEditing(false);
  }
  if (!ready || isRestricted) return null;
  const opened = consent === null || editing;
  const rtl = locale === "ar";
  return opened ? (
    <section aria-label={t.title} dir={rtl ? "rtl" : "ltr"}
      className="fixed bottom-4 left-4 right-4 z-[90] max-w-md rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-xl sm:right-auto">
      <h2 className="font-bold">{t.title}</h2>
      <p className="mt-2 leading-6 text-slate-700">{t.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose("granted")} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">{t.accept}</button>
        <button type="button" onClick={() => choose("denied")} className="rounded-lg border px-4 py-2 font-semibold">{t.reject}</button>
        {consent !== null ? <button type="button" className="px-2 py-2 underline" onClick={() => setEditing(false)}>{t.close}</button> : null}
      </div>
    </section>
  ) : (
    <button type="button" onClick={() => setEditing(true)}
      className="fixed bottom-3 left-3 z-[70] rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-[11px] text-slate-600 shadow-sm">
      {t.change}
    </button>
  );
}
