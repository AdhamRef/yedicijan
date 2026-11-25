import ProjectRedirect from "../[slug]/page";
import type { IncomingSearchParams } from "@/lib/minbar/redirect-query";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<IncomingSearchParams> };

/** Reserved path: resolved by the same rules as any other project link. */
export default function Restoration({ params, searchParams }: Props) {
  return ProjectRedirect({
    params: params.then(({ locale }) => ({ locale, slug: "al-quds-home-restoration" })),
    searchParams: searchParams || Promise.resolve({}),
  });
}
