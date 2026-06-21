import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

type Texts = {
  subject: string;
  preheader: string;
  title: string;
  greeting: string;
  body: string;
  btnLabel: string;
  orCopy: string;
  note: string;
  expires: string;
  ignore: string;
  footer: string;
};

const copy: Record<string, Texts> = {
  ar: {
    subject: "أكّد بريدك الإلكتروني وابدأ بالتبرع",
    preheader: "خطوة واحدة فقط تفصلك عن تفعيل حسابك",
    title: "تأكيد بريدك الإلكتروني",
    greeting: "مرحباً،",
    body: "شكراً لتسجيلك في منصّتنا. انقر الزر أدناه لتأكيد بريدك الإلكتروني وسيتم تسجيل دخولك تلقائياً.",
    btnLabel: "تأكيد الحساب وتسجيل الدخول",
    orCopy: "أو انسخ هذا الرابط في متصفحك",
    note: "الرابط صالح لمرة واحدة فقط.",
    expires: "ينتهي هذا الرابط خلال 24 ساعة",
    ignore: "إذا لم تنشئ حساباً، يمكنك تجاهل هذا البريد بأمان.",
    footer: "© 2026 يدي چيهان · جميع الحقوق محفوظة",
  },
  tr: {
    subject: "E-postanı Onayla ve Bağış Yapmaya Başla",
    preheader: "Hesabını etkinleştirmek için tek bir adım kaldı",
    title: "E-posta Adresinizi Onaylayın",
    greeting: "Merhaba,",
    body: "Kayıt olduğunuz için teşekkürler. Aşağıdaki butona tıklayarak e-posta adresinizi onaylayın — ardından otomatik olarak giriş yapacaksınız.",
    btnLabel: "Hesabı Onayla ve Giriş Yap",
    orCopy: "Ya da bu bağlantıyı tarayıcınıza kopyalayın",
    note: "Bu bağlantı yalnızca bir kez kullanılabilir.",
    expires: "Bağlantı 24 saat içinde geçerliliğini yitirir",
    ignore: "Bir hesap oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.",
    footer: "© 2026 Yedicihan · Tüm hakları saklıdır",
  },
  fr: {
    subject: "Confirmez votre e-mail et commencez à donner",
    preheader: "Plus qu'une étape pour activer votre compte",
    title: "Confirmez votre adresse e-mail",
    greeting: "Bonjour,",
    body: "Merci de vous être inscrit. Cliquez sur le bouton ci-dessous pour confirmer votre adresse — vous serez connecté automatiquement.",
    btnLabel: "Confirmer et se connecter",
    orCopy: "Ou copiez ce lien dans votre navigateur",
    note: "Ce lien n'est utilisable qu'une seule fois.",
    expires: "Ce lien expire dans 24 heures",
    ignore: "Si vous n'avez pas créé de compte, ignorez cet e-mail.",
    footer: "© 2026 Yedicihan · Tous droits réservés",
  },
  es: {
    subject: "Confirma tu correo y empieza a donar",
    preheader: "Solo un paso más para activar tu cuenta",
    title: "Confirma tu dirección de correo",
    greeting: "Hola,",
    body: "Gracias por registrarte. Haz clic en el botón de abajo para confirmar tu correo — iniciarás sesión automáticamente.",
    btnLabel: "Confirmar cuenta e iniciar sesión",
    orCopy: "O copia este enlace en tu navegador",
    note: "Este enlace solo puede usarse una vez.",
    expires: "Este enlace caduca en 24 horas",
    ignore: "Si no creaste una cuenta, ignora este correo.",
    footer: "© 2026 Yedicihan · Todos los derechos reservados",
  },
  pt: {
    subject: "Confirme o seu e-mail e comece a doar",
    preheader: "Só mais um passo para ativar a sua conta",
    title: "Confirme o seu endereço de e-mail",
    greeting: "Olá,",
    body: "Obrigado por se registar. Clique no botão abaixo para confirmar o seu endereço — ficará automaticamente com sessão iniciada.",
    btnLabel: "Confirmar conta e entrar",
    orCopy: "Ou copie este link para o seu navegador",
    note: "Este link só pode ser usado uma vez.",
    expires: "Este link expira em 24 horas",
    ignore: "Se não criou uma conta, ignore este e-mail.",
    footer: "© 2026 Yedicihan · Todos os direitos reservados",
  },
  id: {
    subject: "Konfirmasi Email & Mulai Berdonasi",
    preheader: "Satu langkah lagi untuk mengaktifkan akun Anda",
    title: "Konfirmasi Alamat Email Anda",
    greeting: "Halo,",
    body: "Terima kasih telah mendaftar. Klik tombol di bawah untuk mengonfirmasi alamat email Anda — Anda akan masuk secara otomatis.",
    btnLabel: "Konfirmasi Akun & Masuk",
    orCopy: "Atau salin tautan ini ke browser Anda",
    note: "Tautan ini hanya dapat digunakan sekali.",
    expires: "Tautan ini berlaku selama 24 jam",
    ignore: "Jika Anda tidak membuat akun, abaikan email ini.",
    footer: "© 2026 Yedicihan · Semua hak dilindungi",
  },
  en: {
    subject: "Confirm Your Email & Start Donating",
    preheader: "One step away from activating your account",
    title: "Confirm Your Email Address",
    greeting: "Hello,",
    body: "Thanks for signing up. Click the button below to confirm your email address — you'll be signed in automatically.",
    btnLabel: "Confirm Account & Sign In",
    orCopy: "Or copy this link into your browser",
    note: "This link can only be used once.",
    expires: "This link expires in 24 hours",
    ignore: "If you didn't create an account, you can safely ignore this email.",
    footer: "© 2026 Yedicihan · All rights reserved",
  },
};

function buildVerificationHtml(verificationUrl: string, locale: string): string {
  const tx = copy[locale] ?? copy.en;
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${tx.title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${tx.preheader}&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header band -->
          <tr>
            <td style="background:linear-gradient(135deg,#025EB8 0%,#0471D6 100%);padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 48px 32px;" align="center">
                    <img src="/yedicijan_logo.png" alt="Logo" height="44" style="height:44px;width:auto;display:block;margin:0 auto 20px;filter:brightness(0) invert(1);" />
                    <h1 style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.3px;">${tx.title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 32px;" dir="${dir}">

              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;text-align:${align};">${tx.greeting}</p>
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 36px;text-align:${align};">${tx.body}</p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:#FA5D17;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.2px;line-height:1;">
                      ${tx.btnLabel} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expires pill -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <span style="display:inline-block;background:#FFF7ED;border:1px solid #FED7AA;border-radius:999px;padding:5px 14px;color:#C2410C;font-size:12px;font-weight:600;">
                      ⏱&nbsp; ${tx.expires}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- One-time note -->
              <p style="color:#6B7280;font-size:12px;text-align:center;margin:0 0 24px;">${tx.note}</p>

              <hr style="border:none;border-top:1px solid #F3F4F6;margin:0 0 24px;" />

              <!-- Fallback link -->
              <p style="color:#9CA3AF;font-size:12px;margin:0 0 6px;text-align:${align};">${tx.orCopy}:</p>
              <p style="word-break:break-all;font-size:11px;color:#025EB8;background:#F0F7FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin:0 0 32px;">${verificationUrl}</p>

              <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:0;text-align:center;">${tx.ignore}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:18px 48px;border-top:1px solid #F3F4F6;" align="center">
              <p style="color:#9CA3AF;font-size:11px;margin:0;">${tx.footer}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  verificationUrl: string,
  locale = "en"
): Promise<void> {
  const tx = copy[locale] ?? copy.en;
  const from = process.env.SENDGRID_FROM ?? "noreply@gozbebekleri.org.tr";

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n[VERIFY EMAIL - DEV]\nTo: ${to}\nSubject: ${tx.subject}\nLink: ${verificationUrl}\n`);
    return;
  }

  await sgMail.send({
    to,
    from,
    subject: tx.subject,
    html: buildVerificationHtml(verificationUrl, locale),
  });
}

/* ===================== BULK / TEMPLATE EMAIL ===================== */

export interface BulkEmailRecipient {
  to: string;
  subject: string;
  html: string;
}

export interface BulkEmailResult {
  sent: number;
  failed: { to: string; error: string }[];
}

/**
 * Send personalized emails to many recipients via SendGrid.
 * Each recipient gets its own send call (parallel, capped) because the HTML
 * body is per-donor and SendGrid's `personalizations` array doesn't support
 * different HTML per recipient — it only swaps merge tokens.
 */
export async function sendBulkEmail(
  recipients: BulkEmailRecipient[]
): Promise<BulkEmailResult> {
  const from = process.env.SENDGRID_FROM ?? "noreply@gozbebekleri.org.tr";
  const out: BulkEmailResult = { sent: 0, failed: [] };

  if (recipients.length === 0) return out;

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n[BULK EMAIL - DEV] would send to ${recipients.length} recipients`);
    out.sent = recipients.length;
    return out;
  }

  const CONCURRENCY = 8;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= recipients.length) return;
      const r = recipients[i];
      try {
        await sgMail.send({ to: r.to, from, subject: r.subject, html: r.html });
        out.sent += 1;
      } catch (err) {
        out.failed.push({
          to: r.to,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker));
  return out;
}
