import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getProject } from "@/lib/minbar/projects";
import { withIncomingQuery, type IncomingSearchParams } from "@/lib/minbar/redirect-query";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<IncomingSearchParams>;
}

/**
 * `/bagislar/{slug}` is the shared codebase's project URL. Yedicihan keeps its
 * own project page at `/campaign/{id}`, so links built with
 * `miaPath("projectDetail")` (emails, dashboard tools) land here and are sent
 * on. The query rides along: ad links carry utm_* / gclid / fbclid.
 */
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ProjectRedirect({ params, searchParams }: Props) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  const project = await getProject(decodeURIComponent(slug), locale);
  if (project) permanentRedirect(withIncomingQuery(`/${locale}/campaign/${encodeURIComponent(project.id)}`, query));
  notFound();
}
