"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const HIDDEN = [/\/dashboard(\/|$)/, /\/success(\/|$)/, /\/donation-failed(\/|$)/];

/** Floating WhatsApp button, opposite the floating cart, on every public page. */
export default function WhatsAppButton() {
  const t = useTranslations("Navbar");
  const pathname = usePathname() ?? "";
  if (HIDDEN.some((re) => re.test(pathname))) return null;
  const label = t("whatsapp");
  return (
    <a
      href="https://wa.me/905306516549"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      data-floating-action
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      className="cart-reminder-in group fixed bottom-5 start-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 ring-1 ring-white/30 transition-all duration-200 hover:scale-[1.06] hover:shadow-xl active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
    >
      <MessageCircle className="h-7 w-7 transition-transform duration-200 group-hover:scale-110" strokeWidth={2.2} aria-hidden="true" />
    </a>
  );
}
