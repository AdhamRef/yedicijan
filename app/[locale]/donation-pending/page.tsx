"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

const translations: Record<string, { title: string; description: string; refresh: string; home: string; pending: string }> = {
  ar: { title: "عملية الدفع قيد التحقق", description: "لم نتلقَّ تأكيدًا بنكيًا نهائيًا حتى الآن. هذا لا يعني نجاح الدفع أو فشله. تجنب تكرار الدفع قبل مراجعة كشف البنك أو التواصل مع الدعم.", refresh: "التحقق من الحالة", home: "العودة للموقع", pending: "بانتظار التحقق البنكي" },
  en: { title: "Payment awaiting verification", description: "The bank has not confirmed a final result. This is neither proof of success nor failure. Do not pay again until you verify with your bank or support.", refresh: "Check status", home: "Return to site", pending: "Awaiting bank confirmation" },
  fr: { title: "Paiement en attente de vérification", description: "La banque n'a pas encore confirmé le résultat. Cela ne signifie ni succès ni échec. Ne payez pas à nouveau avant vérification.", refresh: "Vérifier le statut", home: "Retour au site", pending: "Confirmation bancaire en attente" },
  tr: { title: "Ödeme doğrulama bekliyor", description: "Bankadan kesin bir sonuç alınmadı. Bu, ödemenin başarılı veya başarısız olduğu anlamına gelmez. Bankanızla doğrulamadan yeniden ödeme yapmayın.", refresh: "Durumu kontrol et", home: "Siteye dön", pending: "Banka onayı bekleniyor" },
  id: { title: "Pembayaran menunggu verifikasi", description: "Bank belum mengonfirmasi hasil akhir. Ini bukan bukti pembayaran berhasil atau gagal. Jangan membayar ulang sebelum verifikasi.", refresh: "Periksa status", home: "Kembali ke situs", pending: "Menunggu konfirmasi bank" },
  pt: { title: "Pagamento aguardando verificação", description: "O banco ainda não confirmou o resultado final. Isso não indica sucesso nem falha. Não pague novamente antes de verificar.", refresh: "Verificar estado", home: "Voltar ao site", pending: "Aguardando confirmação bancária" },
  es: { title: "Pago pendiente de verificación", description: "El banco aún no confirmó el resultado final. Esto no significa éxito ni fallo. No pague de nuevo antes de verificar.", refresh: "Comprobar estado", home: "Volver al sitio", pending: "Esperando confirmación bancaria" },
  de: { title: "Zahlung wird überprüft", description: "Die Bank hat noch kein endgültiges Ergebnis bestätigt. Dies ist weder eine Erfolgs- noch eine Fehlermeldung. Bitte nicht erneut zahlen, bevor Sie dies geprüft haben.", refresh: "Status prüfen", home: "Zur Website", pending: "Bankbestätigung ausstehend" },
};

export default function DonationPendingPage() {
  const params = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const copy = translations[locale] || translations.en;
  const donationId = params.get("donationId") || "";
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(copy.pending);

  async function checkStatus() {
    if (!/^[a-f0-9]{24}$/i.test(donationId)) return;
    setChecking(true);
    try {
      const response = await fetch("/api/donations/" + encodeURIComponent(donationId), { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "PAID" && data.paidAt) {
          router.replace("/" + locale + "/success/" + donationId);
          return;
        }
        if (data.status === "FAILED") {
          router.replace("/" + locale + "/donation-failed?donationId=" + encodeURIComponent(donationId));
          return;
        }
      }
      setMessage(copy.pending);
    } catch {
      setMessage(copy.pending);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    // A single read; no assumed timeout/failure and no automatic retry.
    void checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donationId]);

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="bg-white rounded-2xl shadow-sm border border-amber-200 max-w-xl w-full p-8 text-center space-y-5">
        <div className="mx-auto rounded-full bg-amber-50 text-amber-700 w-14 h-14 flex items-center justify-center text-2xl" aria-hidden="true">⌛</div>
        <h1 className="font-bold text-2xl text-slate-900">{copy.title}</h1>
        <p className="text-slate-700 leading-relaxed">{copy.description}</p>
        <p role="status" aria-live="polite" className="text-amber-800 text-sm">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => void checkStatus()} disabled={checking || !donationId} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{copy.refresh}</button>
          <a href={"/" + locale} className="rounded-lg border border-slate-300 px-5 py-3 text-slate-700">{copy.home}</a>
        </div>
      </section>
    </main>
  );
}
