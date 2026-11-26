"use client";
import { useEffect, useState } from "react";
import { MAINTENANCE_TEXTS, pauseTexts } from "@/lib/site-security/emergency-texts";

/**
 * Follows the emergency switch on /dashboard/security:
 * - donations paused: a fixed notice at the top of the page;
 * - site closed: the maintenance page over the whole site.
 * Renders nothing while everything is normal.
 */
export default function DonationPauseBanner({ locale }: { locale: string }) {
  const [state, setState] = useState<{ paused: boolean; closed: boolean }>({ paused: false, closed: false });
  useEffect(() => {
    let alive = true;
    const check = () => fetch("/api/site-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (alive) setState({ paused: s?.donationsPaused === true, closed: s?.siteClosed === true }); })
      .catch(() => undefined);
    void check();
    const timer = setInterval(check, 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  if (state.closed) {
    return (
      <div role="alert" style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "#fff", overflowY: "auto", fontFamily: "system-ui,-apple-system,Segoe UI,Tahoma,sans-serif", color: "#1f2937", lineHeight: 1.7 }}>
        <div style={{ maxWidth: "40rem", margin: "12vh auto", padding: "2rem" }}>
          {MAINTENANCE_TEXTS.map((t, i) => (
            <div key={t.lang}>
              {t.title && <h1 dir={t.dir} lang={t.lang} style={{ color: "#8b1d1d", fontSize: 28, fontWeight: 700 }}>{t.title}</h1>}
              <p lang={t.lang} dir={t.dir}>{t.body}</p>
              {i === 0 && <hr style={{ margin: "2rem 0", border: 0, borderTop: "1px solid #e5e7eb" }} />}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!state.paused) return null;
  return (
    <div role="status" style={{ background: "#fff7e6", borderBottom: "1px solid #f5c26b", color: "#7a4b00", padding: "10px 16px", textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
      {pauseTexts(locale).banner}
    </div>
  );
}
