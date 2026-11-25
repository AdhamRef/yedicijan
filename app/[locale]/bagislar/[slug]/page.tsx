import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getProject } from "@/lib/minbar/projects";
import { getSuperCategory } from "@/lib/minbar/super-category";
import { withIncomingQuery, type IncomingSearchParams } from "@/lib/minbar/redirect-query";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<IncomingSearchParams>;
}

/**
 * `/bagislar/{slug}` is the shared codebase's project URL. Yedicihan keeps its
 * own project page at `/campaign/{id}`, so links built with
 * `miaPath("projectDetail")` (emails, dashboard tools, stories, ads) land here
 * and are sent on. A major section has no Yedicihan page of its own and goes
 * to the project list. The query rides along: ad links carry utm_* / gclid / fbclid.
 */
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ProjectRedirect({ params, searchParams }: Props) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const key = decodeURIComponent(slug);

  const project = await getProject(key, locale);
  if (project) permanentRedirect(withIncomingQuery(`/${locale}/campaign/${encodeURIComponent(project.id)}`, query));

  const superCategory = await getSuperCategory(key, locale);
  if (superCategory) permanentRedirect(withIncomingQuery(`/${locale}/campaigns`, query));

  notFound();
}
