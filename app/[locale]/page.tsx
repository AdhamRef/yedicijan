import type { Metadata } from "next";
import { headers } from "next/headers";
import { LOCALE_SEO, buildPageMetadata, SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import HomePageContent from "./_components/homepage/HomePageContent";
import type { SlideItem } from "./_components/homepage/HeroSlider";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildPageMetadata(locale, {
    title: seo.title,
    description: seo.description,
    path: "/",
    keywords: seo.keywords,
  });
}

/**
 * Resolve the request's own origin. We try the actual incoming request host first
 * (works in every environment), then fall back to env vars, then to the hardcoded
 * SITE_URL — making sure SSR self-fetches always reach the same deployment they
 * were rendered from.
 */
async function baseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* fall through */
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return SITE_URL;
}

/**
 * Fetch with a hard timeout so a slow/hanging API can never block the SSR render.
 * PSI / Lighthouse aborts the audit if the document takes longer than ~60 s, returning
 * ERROR with no LCP value — capping each upstream request at 3 s keeps total SSR latency
 * bounded even under degraded backends.
 */
async function safeFetch<T>(url: string, fallback: T, revalidateSeconds = 300, timeoutMs = 3000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      next: { revalidate: revalidateSeconds },
      signal: controller.signal,
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build a Cloudinary-hosted, format-negotiated, mobile-first hero URL at the given width.
 * Cloudinary serves AVIF/WebP automatically via f_auto and aggressive compression via q_auto:eco.
 */
function buildHeroSrc(src: string, width: number): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(
    /\/upload\//,
    `/upload/f_auto,q_auto:eco,w_${width},c_limit/`
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const base = await baseUrl();

  // Fetch every above-the-fold data source server-side and pass them to the client tree
  // as initial state. This eliminates the empty-section → skeleton → real-content swap
  // (which was the root cause of CLS=0.92) and avoids a client waterfall on hydration.
  // All requests run in parallel with a 3 s hard timeout each.
  const [slidesData, campaignsData, categoriesData, postsData] = await Promise.all([
    safeFetch<{ items?: SlideItem[] }>(
      `${base}/api/slides?locale=${locale}`,
      { items: [] }
    ),
    safeFetch<{ items?: unknown[]; nextCursor?: string | null; hasMore?: boolean }>(
      `${base}/api/campaigns?limit=5&sortBy=priority&locale=${locale}`,
      { items: [], hasMore: false }
    ),
    safeFetch<{ items?: unknown[] }>(
      `${base}/api/categories?locale=${locale}&limit=12&sortBy=order`,
      { items: [] }
    ),
    safeFetch<{ items?: unknown[] }>(
      `${base}/api/posts?locale=${locale}&limit=3`,
      { items: [] }
    ),
  ]);

  const initialSlides = Array.isArray(slidesData?.items) ? slidesData.items : [];
  const firstHeroImage = initialSlides[0]?.image ?? null;
  const initialCampaigns = (campaignsData?.items as Parameters<typeof HomePageContent>[0]["initialCampaigns"]) ?? [];
  const initialNextCursor = campaignsData?.nextCursor ?? null;
  const initialHasMore = Boolean(campaignsData?.hasMore);
  const initialCategories = (categoriesData?.items as Parameters<typeof HomePageContent>[0]["initialCategories"]) ?? [];
  const initialPosts = (postsData?.items as Parameters<typeof HomePageContent>[0]["initialPosts"]) ?? [];

  // Preload the LCP image with a srcset that matches what the browser will actually
  // request. We use Cloudinary URLs directly (not the /_next/image proxy) so the
  // preload fires immediately without waiting for the Next.js image optimizer round-trip.
  const preloadSrcSet = firstHeroImage
    ? [
        `${buildHeroSrc(firstHeroImage, 640)} 640w`,
        `${buildHeroSrc(firstHeroImage, 1024)} 1024w`,
        `${buildHeroSrc(firstHeroImage, 1536)} 1536w`,
      ].join(", ")
    : null;

  return (
    <>
      {preloadSrcSet && firstHeroImage && (
        <link
          rel="preload"
          as="image"
          imageSrcSet={preloadSrcSet}
          imageSizes="100vw"
          fetchPriority="high"
        />
      )}
      <HomePageContent
        firstHeroImage={firstHeroImage}
        initialSlides={initialSlides}
        initialCampaigns={initialCampaigns}
        initialNextCursor={initialNextCursor}
        initialHasMore={initialHasMore}
        initialCategories={initialCategories}
        initialPosts={initialPosts}
      />
    </>
  );
}
