import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Messages come from the root layout, which provides the whole locale catalog.
export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
