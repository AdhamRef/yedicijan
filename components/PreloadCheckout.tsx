"use client";

import { useEffect } from "react";

/**
 * The donation and cart dialogs are loaded on demand, so the first "Donate" click waited ~3 s
 * for their code with nothing on screen. Fetch that code once the page is idle instead.
 */
export default function PreloadCheckout() {
  useEffect(() => {
    const load = () => {
      void import("@/components/DonationDialog");
      void import("@/components/CartPaymentDialog");
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(load, { timeout: 4000 });
    } else {
      const id = window.setTimeout(load, 2500);
      return () => window.clearTimeout(id);
    }
  }, []);
  return null;
}
