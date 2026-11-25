import { permanentRedirect } from "next/navigation";
import { withIncomingQuery, type IncomingSearchParams } from "@/lib/minbar/redirect-query";

/** `/bagislar` is the shared codebase's project list; Yedicihan's is `/campaigns`. */
export default async function ProjectsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<IncomingSearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  permanentRedirect(withIncomingQuery(`/${locale}/campaigns`, query));
}
