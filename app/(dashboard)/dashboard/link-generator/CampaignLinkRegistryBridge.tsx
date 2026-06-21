"use client";

import * as React from "react";
import { toast } from "react-hot-toast";

function findMarketingUrl() {
  if (typeof document === "undefined") return "";
  const codes = Array.from(document.querySelectorAll("code"));
  for (const code of codes) {
    const text = code.textContent?.trim() || "";
    if (!text.startsWith("http")) continue;
    if (text.includes("utm_source=") && text.includes("utm_campaign=")) return text;
  }
  return "";
}

function readParam(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() || undefined;
}

function platformFromSource(source?: string, channel?: string) {
  const value = `${source || ""} ${channel || ""}`.toLowerCase();
  if (value.includes("facebook") || value.includes("meta") || value.includes("instagram")) return "META";
  if (value.includes("google")) return "GOOGLE_ADS";
  if (value.includes("tiktok")) return "TIKTOK";
  if (value.includes("x_ads") || value === "x") return "X";
  if (value.includes("twilio")) return "TWILIO";
  if (source) return source.toUpperCase();
  return undefined;
}

export function CampaignLinkRegistryBridge() {
  const [url, setUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setUrl(findMarketingUrl());
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function save() {
    if (!url) return;
    setSaving(true);
    try {
      const parsed = new URL(url);
      const source = readParam(parsed, "utm_source");
      const channel = readParam(parsed, "channel");
      const body = {
        url,
        name: readParam(parsed, "utm_campaign") || readParam(parsed, "campaign_id") || "Marketing link",
        platform: platformFromSource(source, channel),
        channel,
        basePath: parsed.pathname,
        utm_source: source,
        utm_medium: readParam(parsed, "utm_medium"),
        utm_campaign: readParam(parsed, "utm_campaign"),
        utm_id: readParam(parsed, "utm_id"),
        utm_content: readParam(parsed, "utm_content"),
        campaign_id: readParam(parsed, "campaign_id"),
        adset_id: readParam(parsed, "adset_id"),
        ad_id: readParam(parsed, "ad_id"),
        audience_segment: readParam(parsed, "audience_segment") || readParam(parsed, "utm_term"),
        message_variant: readParam(parsed, "message_variant"),
        target_country: readParam(parsed, "target_country"),
        objective: readParam(parsed, "objective"),
      };
      const res = await fetch("/api/admin/marketing-intelligence/campaign-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "save failed");
      toast.success("تم حفظ رابط الحملة في السجل");
    } catch {
      toast.error("تعذر حفظ رابط الحملة");
    } finally {
      setSaving(false);
    }
  }

  if (!url) return null;
  return <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-xl border border-blue-100 bg-white p-3 text-right shadow-lg" dir="rtl">
    <div className="text-sm font-bold text-slate-900">Campaign Registry</div>
    <div className="mt-1 truncate text-xs text-slate-500" dir="ltr">{url}</div>
    <button type="button" onClick={save} disabled={saving} className="mt-2 w-full rounded-md bg-[#025EB8] px-3 py-2 text-xs font-bold text-white hover:bg-[#024a91] disabled:opacity-60">
      {saving ? "جار الحفظ..." : "حفظ رابط الحملة"}
    </button>
  </div>;
}
