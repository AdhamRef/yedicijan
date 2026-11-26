"use client";

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Sticky give bar for phones. Shows once the quick-donate band (#give) has left
 * the screen and scrolls back to it instead of opening a second checkout flow.
 */
export default function MobileDonateBar() {
  const t = useTranslations("HomeRedesign");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("give");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  // Lift the floating live ticker so the two never overlap on small screens.
  useEffect(() => {
    document.documentElement.classList.toggle("has-mobile-donate-bar", visible);
    return () => document.documentElement.classList.remove("has-mobile-donate-bar");
  }, [visible]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-14px_30px_-20px_rgba(18,35,57,.4)] backdrop-blur transition-transform duration-300 lg:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <p className="flex-1 text-xs leading-5 text-gray-500">{t("mobileBarHint")}</p>
      <a
        href="#give"
        tabIndex={visible ? 0 : -1}
        className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-burgundy text-[15px] font-extrabold text-white active:bg-burgundyDark"
      >
        <Heart className="h-4 w-4" />
        {t("mobileBar")}
      </a>
    </div>
  );
}
