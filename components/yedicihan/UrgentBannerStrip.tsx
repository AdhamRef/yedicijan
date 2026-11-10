import Link from "next/link";

export type YediCihanUrgentBanner = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  imageUrl: string | null;
  href: string;
};

export function UrgentBannerStrip({ items }: { items: YediCihanUrgentBanner[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-7xl space-y-3 px-4 py-5 sm:px-6" aria-label="المشاريع العاجلة">
      {items.map((banner) => (
        <article key={banner.id} className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 text-slate-900 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center">
            {banner.imageUrl && (
              // Images are HTTPS-only as enforced by the write API.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover sm:h-40 sm:w-56" />
            )}
            <div className="min-w-0 flex-1 space-y-2 p-5">
              <h2 className="text-xl font-bold">{banner.title}</h2>
              {banner.description && <p className="text-sm leading-relaxed text-slate-700">{banner.description}</p>}
              <Link href={banner.href} className="inline-flex min-h-10 items-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                {banner.ctaLabel}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
