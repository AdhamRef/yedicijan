import type { ReactNode } from "react";

/** Yedicihan's root layout already provides the whole locale catalog
 * (`app/[locale]/layout.tsx`), so these routes need no narrower provider. */
export default function LegacyMessages({ children }: { locale: string; children: ReactNode }) {
  return <>{children}</>;
}
