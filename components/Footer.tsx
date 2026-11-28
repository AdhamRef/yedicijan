'use client';
import YCMark from '@/components/brand/YCMark';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Send, Heart } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import SignInDialog from '@/components/SignInDialog';
import { appendCurrencyQuery, getCurrencyCodeForLinks } from '@/lib/currency-link';
import { getSocialLinks } from '@/lib/social-links';
import { track } from '@vercel/analytics';

const LOGO_URL = '/yedicijan_logo.png';

const Footer = () => {
  const t = useTranslations('Footer');
  const tB = useTranslations('Brand');
  const tZakat = useTranslations('Zakat');
  const tWaqf = useTranslations('Waqf');
  const locale = useLocale() as 'ar' | 'en' | 'fr' | 'tr';
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; slug?: string | null; name: string }[]>([]);
  const pendingMessageKey = 'footer_pending_contact_message';
  const signInCallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.pathname}?footerMessageSent=1`
      : undefined;

  useEffect(() => {
    const shouldSend = searchParams.get('footerMessageSent') === '1';
    if (!shouldSend || !session?.user?.id) return;
    const run = async () => {
      try {
        const raw = window.sessionStorage.getItem(pendingMessageKey);
        if (!raw) { router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks())); return; }
        const parsed = JSON.parse(raw) as { body?: string; locale?: string };
        const trimmed = (parsed.body || '').trim();
        if (!trimmed) { window.sessionStorage.removeItem(pendingMessageKey); router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks())); return; }
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed, locale: parsed.locale || locale, subject: 'COMPLAINT' }),
        });
        if (!res.ok) throw new Error('Failed');
        window.sessionStorage.removeItem(pendingMessageKey);
        setBody('');
        setSubmitMessage(t('sendSuccess'));
        try { track('contact_message_sent', { source: 'footer_after_signin', subject: 'COMPLAINT', locale }); } catch {}
        setTimeout(() => setSubmitMessage(''), 4000);
      } catch {
        try { track('contact_message_failed', { source: 'footer_after_signin', subject: 'COMPLAINT', locale }); } catch {}
        setSubmitMessage(t('sendError'));
        setTimeout(() => setSubmitMessage(''), 3000);
      } finally {
        router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
      }
    };
    run();
  }, [searchParams, session?.user?.id, pathname, router, t, locale]);

  useEffect(() => {
    fetch(`/api/categories?locale=${locale}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        const items = data?.items ?? data ?? [];
        if (Array.isArray(items)) {
          setCategories(
            items.map((c: { id: string; name: string; slug?: string | null }) => ({
              id: c.id,
              slug: c.slug ?? null,
              name: c.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, [locale]);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length < 3) {
      setSubmitMessage(t('sendError'));
      setTimeout(() => setSubmitMessage(''), 3000);
      return;
    }
    if (!session?.user?.id) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(pendingMessageKey, JSON.stringify({ body: trimmed, locale }));
      }
      setIsSignInOpen(true);
      return;
    }
    setIsSubmitting(true);
    setSubmitMessage('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, locale, subject: 'COMPLAINT' }),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitMessage(t('sendSuccess'));
      setBody('');
      try { track('contact_message_sent', { source: 'footer', subject: 'COMPLAINT', locale }); } catch {}
      setTimeout(() => setSubmitMessage(''), 4000);
    } catch {
      try { track('contact_message_failed', { source: 'footer', subject: 'COMPLAINT', locale }); } catch {}
      setSubmitMessage(t('sendError'));
      setTimeout(() => setSubmitMessage(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTr = locale === 'tr';
  const isAr = locale === 'ar';

  // Built dynamically from the API — see useEffect above

  const quickLinks = [
    { label: isTr ? 'Hakkımızda' : isAr ? 'من نحن' : 'About Us', href: '/about-us' },
    { label: isTr ? 'Projeler' : isAr ? 'المشاريع' : 'Projects', href: '/campaigns' },
    { label: tZakat('navLabel'), href: '/zakat' },
    { label: tWaqf('navLabel'), href: '/waqf' },
    { label: isTr ? 'Haberler' : isAr ? 'الأخبار' : 'News', href: '/blog' },
    { label: isTr ? 'Banka Hesapları' : isAr ? 'الحسابات البنكية' : 'Bank Accounts', href: '/bank-transfer' },
    { label: isTr ? 'İletişim' : isAr ? 'اتصل بنا' : 'Contact', href: '/contact-us' },
    { label: isTr ? 'Gizlilik Politikası' : isAr ? 'سياسة الخصوصية' : 'Privacy Policy', href: '/privacy' },
    { label: isTr ? 'Kullanım Şartları' : isAr ? 'شروط الاستخدام' : 'Terms of Use', href: '/terms' },
  ];

  const social = getSocialLinks(locale);
  const socialLinks = [
    { Icon: Facebook, href: social.facebook, label: 'Facebook' },
    { Icon: Twitter, href: social.twitter, label: 'Twitter' },
    { Icon: Instagram, href: social.instagram, label: 'Instagram' },
  ] as const;

  return (
    <footer className="relative isolate overflow-hidden bg-deep text-white">
      <div className="topo-layer -z-10 text-white/[0.07]" aria-hidden />

      {/* ── Closing call to action — red band with the YC monogram ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-20">
        <div className="relative isolate flex flex-col items-start gap-5 overflow-hidden rounded-[28px] bg-burgundy px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <YCMark className="absolute -bottom-12 end-[-10px] -z-10 h-auto w-52 text-white/[0.08]" />
          <div>
            <p className="text-[22px] font-extrabold leading-snug sm:text-[28px]">{tB('footerCtaTitle')}</p>
            <p className="mt-1 text-sm text-white/80">{tB('footerCtaText')}</p>
          </div>
          <Link
            href="/campaigns"
            className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-7 sm:w-auto text-[15px] font-extrabold text-deep transition-colors hover:bg-[#ffc965]"
          >
            <Heart className="h-4 w-4" />
            {tB('donateNow')}
          </Link>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-x-8">

          {/* ── Brand ── */}
          <div className="col-span-2 lg:col-span-1 flex flex-col">
            <Link href="/" className="inline-block mb-5">
              <Image src={LOGO_URL} alt="YediCihan 1961" width={716} height={270} className="h-14 w-auto object-contain brightness-0 invert" />
            </Link>
            <p className="text-sm text-ice/75 leading-relaxed mb-6 max-w-xs">
              {t('aboutUsDesc1')}
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2.5 mt-auto">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-full ring-1 ring-white/20 hover:bg-gold hover:text-deep hover:ring-gold text-white flex items-center justify-center transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Online Donate ── */}
          <div>
            <h2 className="flex flex-col text-sm font-bold text-white mb-5">
              {isTr ? 'Online Bağış' : isAr ? 'التبرع الإلكتروني' : 'Online Donate'}
              <span className="mt-2 h-[3px] w-8 rounded-full bg-gold" />
            </h2>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug || cat.id}`}
                    className="group flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors sm:gap-2.5 sm:text-[15px]"
                  >
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-burgundy transition-colors group-hover:bg-gold" />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Quick Links ── */}
          <div>
            <h2 className="flex flex-col text-sm font-bold text-white mb-5">
              {isTr ? 'Bağlantılar' : isAr ? 'روابط سريعة' : 'Quick Links'}
              <span className="mt-2 h-[3px] w-8 rounded-full bg-gold" />
            </h2>
            <ul className="space-y-2.5">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors sm:gap-2.5 sm:text-[15px]"
                  >
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-burgundy transition-colors group-hover:bg-gold" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact + Message ── */}
          <div className="col-span-2 lg:col-span-1">
            <h2 className="flex flex-col text-sm font-bold text-white mb-5">
              {isTr ? 'İletişim' : isAr ? 'تواصل معنا' : 'Contact'}
              <span className="mt-2 h-[3px] w-8 rounded-full bg-gold" />
            </h2>

            {/* Contact info */}
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <span className="w-8 h-8 rounded-lg bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-gold" />
                </span>
                <span className="mt-1.5" dir={isAr ? 'rtl' : 'ltr'}>{isAr ? 'شارع معمار سنان رقم 38، باغلار، 34209 باغجلار / إسطنبول' : 'Bağlar, Mimar Sinan Cd. No:38, 34209 Bağcılar / İstanbul'}</span>
              </li>
              <li>
                <a
                  href="tel:+905306516549"
                  className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-gold" />
                  </span>
                  <span dir="ltr">+90 530 651 65 49</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@yedicihan.org"
                  className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-gold" />
                  </span>
                  info@yedicihan.org
                </a>
              </li>
            </ul>

            {/* Message form */}
            <form onSubmit={handleMessageSubmit} className="flex flex-col gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('messagePlaceholder')}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-4 py-3 text-sm rounded-2xl bg-white/[0.06] border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 focus:bg-white/10 resize-none disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-white/10 hover:bg-gold hover:text-deep text-white text-sm font-bold transition-all duration-200 ring-1 ring-white/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? t('sending') : t('send')}
              </button>
            </form>
            {submitMessage && (
              <p className={`mt-2 text-xs ${/success|نجاح|başar/i.test(submitMessage) ? 'text-green-300' : 'text-red-300'}`}>
                {submitMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <p className="flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-gold fill-gold/30" />
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <p dir="ltr">YediCihan Uluslararası Yardımlaşma Derneği · 1961</p>
        </div>
      </div>

      <SignInDialog isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} callbackUrl={signInCallbackUrl} />
    </footer>
  );
};

export default Footer;
