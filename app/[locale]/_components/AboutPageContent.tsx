'use client';
import YCMark from '@/components/brand/YCMark';
import Image from 'next/image';
// Imported rather than referenced as "/WEBSITE.png" so Next reads the file's real
// dimensions at build time, fingerprints the URL for immutable caching, and can
// generate the blur placeholder used below.
import websiteImage from '@/public/WEBSITE.png';
import { ArrowLeft, Heart, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import PageHero from '@/components/brand/PageHero';
import SectionHeading from '@/components/brand/SectionHeading';
import BrandDots from '@/components/brand/BrandDots';
import SevenWorlds from './homepage/SevenWorlds';
import ReachSection from './homepage/ReachSection';

/**
 * About page on the 2025 brand guide: the guide's own team photo, the history
 * text, vision as a pull quote on navy, goals as a numbered list, and the
 * board's message. Removed: stock Unsplash photos, an unverified "50,000+"
 * badge and a portrait that belonged to another association.
 */
const AboutUs = () => {
  const t = useTranslations('AboutUs');
  const tB = useTranslations('Brand');

  const goals = t.raw('goalsList') as string[];
  const presidentMessage = t.raw('presidentMessageParagraphs') as string[];

  return (
    <div className="bg-offwhite">
      <PageHero
        crumbs={[{ href: '/', label: tB('home') }, { label: t('pageTitle') }]}
        eyebrow={t('associationName')}
        title={t('pageTitle')}
        mark={tB('since')}
        subtitle={t('goalsDesc')}
      />

      {/* ── Story ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-6">
          <div>
            <SectionHeading eyebrow={t('associationName')} title={t('aboutUsTitle')} />
            <div className="mt-6 space-y-4 text-base leading-8 text-gray-600">
              <p>{t('aboutUsDesc1')}</p>
              <p>{t('aboutUsDesc2')}</p>
            </div>
          </div>
          <div className="relative">
            <div className="relative h-[300px] overflow-hidden rounded-t-[180px] rounded-b-[28px] bg-sand shadow-[0_30px_60px_-30px_rgba(18,35,57,.45)] sm:h-[420px]">
              <Image
                src={websiteImage}
                alt={t('associationName')}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 start-6 grid h-28 w-28 -rotate-6 place-items-center rounded-full bg-gold shadow-lg">
              <YCMark className="h-auto w-14 text-deep" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="relative isolate overflow-hidden bg-deep py-16 text-white sm:py-24">
        <div className="topo-layer -z-10 text-white/[0.08]" aria-hidden />
        <div className="mx-auto max-w-4xl px-5 text-center">
          <span className="inline-flex items-center gap-2.5 text-[13px] font-bold text-gold">
            <BrandDots />
            {t('vision')} · {t('visionTitle')}
          </span>
          <Quote className="mx-auto mt-6 h-10 w-10 text-gold" />
          <blockquote className="mt-4 text-2xl font-extrabold leading-[1.6] sm:text-[32px]">{t('visionQuote')}</blockquote>
        </div>
      </section>

      {/* ── Goals ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <SectionHeading eyebrow={t('goals')} title={t('goalsTitle')} subtitle={t('goalsDesc')} align="center" />
          <ol className="mt-12 grid gap-4 md:grid-cols-2">
            {goals.map((goal, index) => (
              <li key={index} className="grid grid-cols-[48px_1fr] items-start gap-4 rounded-2xl border border-line bg-white p-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-deep text-lg font-black text-gold" dir="ltr">
                  {index + 1}
                </span>
                <p className="pt-1.5 text-[15px] leading-7 text-deep">{goal}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SevenWorlds />

      {/* ── Board message ── */}
      <section className="border-y border-line bg-white py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-6">
          <div>
            <SectionHeading eyebrow={t('presidentMessage')} title={t('presidentTitle')} />
            <div className="mt-8 flex items-center gap-4 rounded-2xl bg-offwhite p-5">
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-deep ring-2 ring-gold sm:h-24 sm:w-24">
                <Image
                  src="/president.png"
                  alt={t('presidentName')}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </span>
              <div>
                <b className="block text-base font-extrabold text-deep">{t('presidentName')}</b>
                <span className="text-sm text-gray-500">{t('presidentPosition')}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4 text-base leading-8 text-gray-600">
            {presidentMessage.map((paragraph, index) => (
              <p key={index} className={index === presidentMessage.length - 1 ? 'font-extrabold text-burgundy' : ''}>
                {paragraph}
              </p>
            ))}
            <div className="flex flex-wrap gap-3 pt-4">
              <Link href="/campaigns" className="inline-flex h-12 items-center gap-2 rounded-full bg-burgundy px-6 font-bold text-white hover:bg-burgundyDark">
                <Heart className="h-4 w-4" />
                {t('donateNow')}
              </Link>
              <Link href="/contact-us" className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-deep/20 px-6 font-bold text-deep hover:border-deep">
                {t('contactUs')}
                <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ReachSection />
    </div>
  );
};

export default AboutUs;
