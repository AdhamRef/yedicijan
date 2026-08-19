'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { appendCurrencyQuery, getCurrencyCodeForLinks } from '@/lib/currency-link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandHeartIcon, Receipt, Calendar, Heart, ArrowLeft, Repeat, Info, Download, Loader2, FileText, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { useConfettiStore } from '@/hooks/use-confetti-store';
import axios from 'axios';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { ar, enUS, fr, tr, id, pt, es } from 'date-fns/locale';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';
import SignInDialog from '@/components/SignInDialog';
import { useTracking } from '@/components/TrackingPixels';

const dateLocales: Record<string, Locale> = { ar, en: enUS, fr, tr, id, pt, es };

type DonateTrackingPayload = {
  ok: true;
  eventName: 'Donate';
  eventId: string;
  transactionId: string;
  orderId: string;
  value: number;
  currency: string;
  contentType: 'donation';
  contentIds: string[];
  contentName: string;
  contentCategory: string;
  contents: Array<{ id: string; quantity: number; item_price: number }>;
  numItems: number;
  status: 'paid';
  success: true;
  paymentInfoAvailable: true;
  donationType: 'ONE_TIME' | 'MONTHLY';
  paymentMethod: string;
};

const DONATE_TRACKING_MAX_ATTEMPTS = 20;
const DONATE_TRACKING_RETRY_MS = 750;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DonationSuccessPage = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const t = useTranslations('DonationSuccess');
  const locale = useLocale();
  const confetti = useConfettiStore();
  const { data: session, status: sessionStatus } = useSession();
  const tracking = useTracking();
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [linkState, setLinkState] = useState<'idle' | 'linking' | 'linked' | 'failed'>('idle');
  const linkAttemptedRef = useRef(false);
  const donateFireAttemptedRef = useRef(false);
  const dateLocale = dateLocales[locale] ?? enUS;
  const isRtl = locale === 'ar';
  const isMonthly = donation?.type === 'MONTHLY';

  // Show the signup CTA only to unauthenticated visitors looking at their own
  // fresh donation — once they're signed in there's nothing more to claim.
  const showSignupCta =
    !!donation &&
    sessionStatus !== 'loading' &&
    !session?.user?.id &&
    linkState !== 'linked';

  useEffect(() => {
    if (id) {
      fetchDonation();
      confetti.onOpen();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchDonation = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/donations/${id}`);
      setDonation(response.data);
    } catch (error) {
      console.error('Error fetching donation:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Meta Donate fire (paired with server CAPI) ───────────────────────────
  // The conversion source of truth is /api/donations/:id/tracking, not the
  // success page donation object. The donation row can be visible here before
  // paidAt is stamped by Stripe/PayFor callbacks, so we poll briefly until the
  // canonical tracking endpoint returns ok=true. This prevents the old bug where
  // a first ok=false (paidAt unset) marked the attempt as done and Donate never
  // fired even though the payment became confirmed a moment later.
  useEffect(() => {
    if (!id) return;
    if (donateFireAttemptedRef.current) return;
    if (!donation) return;
    if (typeof window === 'undefined') return;
    if (!tracking?.config?.facebookPixelId) return;

    const localKey = `donate_fired:${id}`;
    try {
      if (window.localStorage.getItem(localKey)) {
        donateFireAttemptedRef.current = true;
        return;
      }
    } catch {
      // Storage access denied — server claim is still authoritative.
    }

    donateFireAttemptedRef.current = true;

    let cancelled = false;
    (async () => {
      let payload: DonateTrackingPayload | null = null;

      // The user can land on /success before payment webhooks/callbacks finish
      // stamping paidAt. Retry the read-only DB payload endpoint for a short
      // window; never fire unless it returns ok=true.
      for (let attempt = 1; attempt <= DONATE_TRACKING_MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) return;
        try {
          const res = await axios.get(`/api/donations/${id}/tracking`, {
            headers: { 'Cache-Control': 'no-store' },
          });
          if (res.data?.ok === true) {
            payload = res.data;
            break;
          }

          if (process.env.NODE_ENV !== 'production' && attempt === 1) {
            console.debug('[Donate] tracking payload not ready yet:', res.data?.reason);
          }
        } catch (err) {
          console.error('[Donate] tracking payload fetch failed:', err);
          donateFireAttemptedRef.current = false;
          return;
        }

        if (attempt < DONATE_TRACKING_MAX_ATTEMPTS) {
          if (attempt === 4 || attempt === 10) void fetchDonation();
          await sleep(DONATE_TRACKING_RETRY_MS);
        }
      }

      if (cancelled) return;
      if (!payload) {
        // Do not set local/session storage. The visitor can refresh and the
        // server endpoint still protects against duplicates if it later becomes paid.
        donateFireAttemptedRef.current = false;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Donate] tracking payload never became ready; Donate not fired', { id });
        }
        return;
      }

      const sessionKey = `meta_donate_${payload.eventId}`;
      try {
        if (window.sessionStorage.getItem(sessionKey)) return;
      } catch {
        // sessionStorage blocked — fall through to server claim.
      }

      let allowed = false;
      let alreadyFired = false;
      try {
        const claim = await axios.post(`/api/donations/${id}/track-conversion`);
        allowed = claim.data?.allowed === true;
        alreadyFired = claim.data?.alreadyFired === true;
      } catch (err) {
        console.error('[Donate] track-conversion failed:', err);
        donateFireAttemptedRef.current = false;
        return;
      }
      if (cancelled) return;

      // Browser Pixel must still fire when the server already claimed the
      // CAPI conversion — Meta dedupes via the shared `event_id`. Without
      // this, browser-side Pixel coverage drops to zero now that
      // dispatchDonationPaid fires CAPI server-side.
      if ((allowed || alreadyFired) && tracking?.trackDonate) {
        tracking.trackDonate({
          donationId: payload.transactionId,
          value: payload.value,
          currency: payload.currency,
          contentIds: payload.contentIds,
          contents: payload.contents,
          contentName: payload.contentName,
          contentCategory: payload.contentCategory,
          donationType: payload.donationType,
          paymentMethod: payload.paymentMethod,
        });

        try {
          const w = window as unknown as { dataLayer?: unknown[] };
          if (Array.isArray(w.dataLayer)) {
            w.dataLayer.push({
              event: 'donation_paid',
              event_id: payload.eventId,
              transaction_id: payload.transactionId,
              order_id: payload.orderId,
              value: payload.value,
              currency: payload.currency,
              content_type: payload.contentType,
              content_ids: payload.contentIds,
              content_name: payload.contentName,
              content_category: payload.contentCategory,
              contents: payload.contents,
              num_items: payload.numItems,
              status: payload.status,
              success: payload.success,
              payment_info_available: payload.paymentInfoAvailable,
              donation_type: payload.donationType === 'MONTHLY' ? 'monthly' : 'one_time',
              payment_method: payload.paymentMethod,
            });
          }
        } catch {
          // dataLayer push is best-effort.
        }

        try {
          window.sessionStorage.setItem(sessionKey, '1');
        } catch {
          // ignore
        }
      }

      if (allowed || alreadyFired) {
        try {
          window.localStorage.setItem(localKey, '1');
        } catch {
          // ignore — server claim is authoritative.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, donation, tracking]);

  // After the donor signs in (either inline via the dialog or via a Google
  // redirect that drops them back here), automatically pull every donation
  // attached to the guest record onto the freshly-authenticated account.
  useEffect(() => {
    if (!id) return;
    if (linkAttemptedRef.current) return;
    if (sessionStatus !== 'authenticated') return;
    if (!donation?.donor?.id) return;
    if (session?.user?.id === donation.donor.id) return;

    linkAttemptedRef.current = true;
    setLinkState('linking');
    axios
      .post('/api/users/link-guest', { donationId: id })
      .then(async () => {
        setLinkState('linked');
        await fetchDonation();
      })
      .catch((err) => {
        const reason = err?.response?.data?.error;
        // Donor was already a real account (e.g. matched by email) — nothing
        // to merge, just hide the banner.
        if (reason === 'GUEST_NOT_ELIGIBLE') {
          setLinkState('linked');
        } else {
          console.error('[link-guest]', err);
          setLinkState('failed');
        }
      });
  }, [id, sessionStatus, session?.user?.id, donation?.donor?.id]);

  const handleDownloadReceipt = async () => {
    if (!donation || !id) return;
    
    setIsDownloading(true);
    try {
      const response = await axios.get(`/api/donations/${id}/receipt`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `donation-receipt-${donation.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      // You might want to show a toast notification here
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton dir={isRtl ? 'rtl' : 'ltr'} />;
  }

  if (!donation) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="text-slate-600">{t('donationReceivedMessage')}</p>
      </main>
    );
  }

  const nextBillingFormatted = donation.nextBillingDate
    ? format(new Date(donation.nextBillingDate), 'dd MMMM yyyy', { locale: dateLocale })
    : null;

  return (
    <main
      className="min-h-screen bg-gray-50"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero block */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#A5243D] text-white shadow-lg shadow-[#A5243D]/25 mb-6">
            <HandHeartIcon className="w-12 h-12" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            {t('thankYouName', { name: donation.donor?.name ?? '' })}
          </h1>
          <p className="text-lg text-slate-600 max-w-md mx-auto">
            {t('donationReceivedMessage')}
          </p>
          <p className="mt-4 text-sm text-slate-500 font-mono">
            {t('referenceId')}: {donation.id}
          </p>
        </motion.section>

        {/* Download Receipt Banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mb-8"
        >
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/50 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-center sm:text-start">
                    <p className="font-semibold text-slate-900 mb-0.5">
                      {t('downloadReceipt')}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t('receiptDescription')}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleDownloadReceipt}
                  disabled={isDownloading}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('downloading')}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      {t('downloadPDF')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Sign-up CTA — guest donations only. Encourages the donor to claim
            this donation under a real account so their history persists. */}
        {showSignupCta && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="mb-8"
          >
            <Card className="border-2 border-[#D8AA55]/30 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50/40 shadow-sm overflow-hidden">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A5243D] to-orange-600 text-white shadow-md">
                      <UserPlus className="w-7 h-7" />
                    </div>
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow ring-2 ring-white">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-start">
                    <p className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                      {t('signupCtaTitle')}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {t('signupCtaBody')}
                    </p>
                    <ul className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-[12px] text-slate-700">
                      <li className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#A5243D]" />
                        {t('signupCtaBenefitHistory')}
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#A5243D]" />
                        {t('signupCtaBenefitReceipts')}
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-[#D8AA55]" />
                        {t('signupCtaBenefitImpact')}
                      </li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => setSignInOpen(true)}
                    className="gap-2 bg-[#A5243D] hover:bg-[#7D1830] text-white font-semibold px-6 py-5 rounded-xl shadow-md hover:shadow-lg transition-all shrink-0"
                  >
                    <UserPlus className="w-5 h-5" />
                    {t('signupCtaButton')}
                  </Button>
                </div>
                {linkState === 'failed' && (
                  <p className="mt-3 text-[12px] text-rose-600 text-center sm:text-start">
                    {t('linkFailed')}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Tiny confirmation when we've just merged a guest donation onto a
            signed-in account — gives the donor a clear "your history now
            includes this donation" signal. */}
        {linkState === 'linked' && sessionStatus === 'authenticated' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{t('linkSuccess')}</span>
          </motion.div>
        )}

        {/* Monthly donation highlight */}
        {isMonthly && donation.nextBillingDate && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="mb-8"
          >
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      {t('monthlyDonation')}
                    </p>
                    <p className="text-slate-800 font-semibold">{t('monthlyDonationBadge')}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {nextBillingFormatted && (
                    <div className="flex items-center gap-3 rounded-lg bg-white/80 p-3">
                      <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">{t('nextBillingLabel')}</p>
                        <p className="font-semibold text-slate-900">
                          {nextBillingFormatted}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2 rounded-lg bg-slate-100/80 p-3 text-sm text-slate-600">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                  <p>{t('cancelMonthlyHint')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Details + Where donated */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <Card className="border border-slate-200/80 shadow-sm h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Receipt className="w-5 h-5 text-slate-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">{t('donationDetails')}</h2>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(donation.createdAt), 'dd MMMM yyyy', { locale: dateLocale })}
                </p>
                <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600">{t('totalAmount')}</span>
                    <span className="text-xl font-bold text-slate-900" dir="ltr">
                      {donation.totalAmount.toLocaleString()} {donation.currency}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                    <p className="flex justify-between">
                      <span>{t('baseAmount')}</span>
                      <span dir="ltr">{donation.amount.toLocaleString()} {donation.currency}</span>
                    </p>
                    {donation.teamSupport > 0 && (
                      <p className="flex justify-between">
                        <span>{t('teamSupport')}</span>
                        <span dir="ltr">{donation.teamSupport.toLocaleString()} {donation.currency}</span>
                      </p>
                    )}
                    {donation.coverFees && (
                      <p className="flex justify-between">
                        <span>{t('transactionFees')}</span>
                        <span dir="ltr">{donation.fees.toLocaleString()} {donation.currency}</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {((donation.items?.length > 0) || (donation.categoryItems?.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <Card className="border border-slate-200/80 shadow-sm h-full">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-slate-900 mb-4">
                    {donation.items?.length > 0 && donation.categoryItems?.length > 0
                      ? t('campaignsAndCategoriesDonatedTo')
                      : donation.items?.length > 0
                        ? t('campaignsDonatedTo')
                        : t('categoriesDonatedTo')}
                  </h2>
                  <div className="space-y-3">
                    {(donation.items || []).map((item: any) => {
                      const title =
                        item.campaign?.translations?.find((tr: { locale: string }) => tr.locale === locale)?.title ??
                        item.campaign?.title ?? '';
                      const imgSrc = item.campaign?.images?.[0];
                      return (
                        <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                            {imgSrc ? (
                              <Image src={imgSrc} alt={title} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Heart className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{title}</p>
                            <p className="text-sm text-emerald-600 font-medium" dir="ltr">
                              {item.amount.toLocaleString()} {donation.currency}
                              {item.shareCount != null && item.shareCount > 0 && (
                                <span className="block text-xs text-violet-700 mt-0.5">
                                  {t("itemShares", { count: item.shareCount })}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {(donation.categoryItems || []).map((catItem: any) => {
                      const name =
                        catItem.category?.translations?.find((tr: { locale: string }) => tr.locale === locale)?.name ??
                        catItem.category?.name ?? '';
                      const imgSrc = catItem.category?.image;
                      return (
                        <div key={catItem.id} className="flex gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                            {imgSrc ? (
                              <Image src={imgSrc} alt={name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Heart className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{name}</p>
                            <p className="text-sm text-emerald-600 font-medium" dir="ltr">
                              {catItem.amount.toLocaleString()} {donation.currency}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={() =>
              router.push(appendCurrencyQuery('/campaigns', getCurrencyCodeForLinks()))
            }
            className="gap-2 bg-[#A5243D] hover:bg-[#7D1830] text-white font-medium py-6 px-6 rounded-xl shadow-md"
          >
            <Heart className="w-5 h-5" />
            {t('browseCampaigns')}
          </Button>
          <Button
            onClick={() => router.push(appendCurrencyQuery('/', getCurrencyCodeForLinks()))}
            variant="outline"
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-6 px-6 rounded-xl"
          >
            {t('backToHome')}
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </Button>
        </motion.div>
      </div>

      {/* Sign-in dialog opened by the guest CTA. We hand it the current path
          as callbackUrl so a full OAuth redirect drops the donor back here,
          where the link-guest effect will fire automatically. */}
      <SignInDialog
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        callbackUrl={pathname}
      />
    </main>
  );
};

const LoadingSkeleton = ({ dir = 'rtl' }: { dir?: 'rtl' | 'ltr' }) => (
  <div className="min-h-screen bg-slate-50 p-4" dir={dir}>
    <div className="max-w-3xl mx-auto py-12">
      <div className="text-center mb-10">
        <Skeleton className="w-24 h-24 rounded-full mx-auto mb-6" />
        <Skeleton className="h-10 w-64 mx-auto mb-3" />
        <Skeleton className="h-5 w-80 mx-auto mb-4" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <Skeleton className="h-24 rounded-xl mb-8" />
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <div className="flex justify-center gap-3">
        <Skeleton className="h-14 w-44 rounded-xl" />
        <Skeleton className="h-14 w-44 rounded-xl" />
      </div>
    </div>
  </div>
);

export default DonationSuccessPage;
