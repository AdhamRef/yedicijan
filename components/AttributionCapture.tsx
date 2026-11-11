"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttributionFromUrl } from "@/lib/attribution/client-payload";
import { TRACKING_CONSENT_EVENT } from "@/lib/tracking/consent";

/** Persists UTM/click ids in cookies (30d) for donation attribution. */
export function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    captureAttributionFromUrl();
    window.addEventListener(TRACKING_CONSENT_EVENT, captureAttributionFromUrl);
    return () => window.removeEventListener(TRACKING_CONSENT_EVENT, captureAttributionFromUrl);
  }, [pathname, searchParams]);
  return null;
}
