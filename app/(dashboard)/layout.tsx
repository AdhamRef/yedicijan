import type { Metadata } from "next";
import RootDocument, { rootMetadata } from "@/components/root/RootDocument";

// A root layout of its own (the site has one per area: [locale], dashboard, auth), in Arabic.
export const metadata: Metadata = rootMetadata;

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument locale="ar">{children}</RootDocument>;
}
