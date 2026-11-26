/** Donation-pause texts. No imports: shared by the server check and the browser banner. */
export type PauseTexts = { banner: string; refused: string };
/** One entry per enabled site language (lib/locales.ts). */
const PAUSE_TEXTS: Record<"ar" | "en" | "fr" | "tr" | "id" | "pt" | "es" | "de", PauseTexts> = {
  ar: { banner: "نجري تحسينات على نظام التبرع، وسيعود خلال وقت قصير بإذن الله. يمكنكم تصفح المشاريع حتى ذلك الحين.", refused: "التبرع متوقف مؤقتاً لإجراء تحسينات. يرجى المحاولة بعد قليل." },
  en: { banner: "We are making improvements to our donation system; it will be back shortly. You can browse our projects in the meantime.", refused: "Donations are temporarily paused for improvements. Please try again shortly." },
  fr: { banner: "Nous apportons des améliorations à notre système de dons ; il sera de retour sous peu. Vous pouvez parcourir nos projets en attendant.", refused: "Les dons sont temporairement suspendus pour des améliorations. Veuillez réessayer dans quelques instants." },
  tr: { banner: "Bağış sistemimizde iyileştirmeler yapıyoruz; kısa süre içinde yeniden hizmetinizde olacak. Bu sırada projelerimize göz atabilirsiniz.", refused: "Bağış, iyileştirmeler nedeniyle geçici olarak durduruldu. Lütfen biraz sonra tekrar deneyin." },
  id: { banner: "Kami sedang menyempurnakan sistem donasi kami; sistem akan segera kembali. Sementara itu, Anda dapat melihat proyek-proyek kami.", refused: "Donasi dihentikan sementara untuk penyempurnaan. Silakan coba lagi sebentar lagi." },
  pt: { banner: "Estamos a melhorar o nosso sistema de doações; voltará em breve. Entretanto, pode consultar os nossos projetos.", refused: "As doações estão temporariamente suspensas para melhorias. Tente novamente dentro de instantes." },
  es: { banner: "Estamos mejorando nuestro sistema de donaciones; volverá en breve. Mientras tanto, puede consultar nuestros proyectos.", refused: "Las donaciones están pausadas temporalmente por mejoras. Vuelva a intentarlo en unos momentos." },
  de: { banner: "Wir verbessern gerade unser Spendensystem; es ist in Kürze wieder verfügbar. In der Zwischenzeit können Sie unsere Projekte ansehen.", refused: "Spenden sind wegen Verbesserungen vorübergehend pausiert. Bitte versuchen Sie es in Kürze erneut." },
};
/** The donor's language; anything else reads the English text. */
export function pauseTexts(locale: string | null | undefined): PauseTexts {
  const l = String(locale ?? "").slice(0, 2).toLowerCase();
  return l in PAUSE_TEXTS ? PAUSE_TEXTS[l as keyof typeof PAUSE_TEXTS] : PAUSE_TEXTS.en;
}
/** The donor's locale for an API call: the site's locale cookie, else the page that made the call. */
export function requestLocale(cookieLocale: string | undefined, referer: string | null): string | null {
  if (cookieLocale && /^[a-z]{2}$/i.test(cookieLocale)) return cookieLocale;
  const m = referer?.match(/^https?:\/\/[^/]+\/([a-z]{2})(?:\/|$)/i);
  return m ? m[1] : null;
}

/** Shown when the whole public site is closed. One paragraph per enabled language. */
export const MAINTENANCE_TEXTS: ReadonlyArray<{ lang: string; dir: "rtl" | "ltr"; title?: string; body: string }> = [
  { lang: "ar", dir: "rtl", title: "الموقع متوقف مؤقتاً للصيانة", body: "نعمل على تحسين الموقع وسيعود قريباً بإذن الله. شكراً لصبركم ودعمكم." },
  { lang: "tr", dir: "ltr", body: "Sitemiz kısa bir süreliğine bakımdadır. En kısa sürede geri döneceğiz. Desteğiniz için teşekkür ederiz." },
  { lang: "en", dir: "ltr", body: "Our website is temporarily down for maintenance and will be back shortly. Thank you for your patience and support." },
  { lang: "fr", dir: "ltr", body: "Notre site est temporairement en maintenance et sera de retour sous peu. Merci de votre patience et de votre soutien." },
  { lang: "id", dir: "ltr", body: "Situs kami sedang dalam pemeliharaan sementara dan akan segera kembali. Terima kasih atas kesabaran dan dukungan Anda." },
  { lang: "pt", dir: "ltr", body: "O nosso site está temporariamente em manutenção e voltará em breve. Obrigado pela sua paciência e apoio." },
  { lang: "es", dir: "ltr", body: "Nuestro sitio está temporalmente en mantenimiento y volverá en breve. Gracias por su paciencia y apoyo." },
  { lang: "de", dir: "ltr", body: "Unsere Website wird vorübergehend gewartet und ist in Kürze wieder verfügbar. Vielen Dank für Ihre Geduld und Unterstützung." },
];
