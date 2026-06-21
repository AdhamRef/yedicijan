/**
 * Client-side display metadata for the Connections page (icons, accent
 * colors, Arabic labels). The authoritative requirements / readiness logic
 * lives in `lib/marketing/platform-connection-requirements.ts` — this file
 * only adds presentation hints.
 */
import type { ComponentType } from "react";
import {
  Facebook,
  Globe,
  Music2,
  Twitter,
  BarChart3,
  MessageSquare,
  Mail,
  Plug,
} from "lucide-react";

export const PLATFORMS = [
  "META",
  "GOOGLE_ADS",
  "TIKTOK",
  "X",
  "GA4",
  "TWILIO",
  "EMAIL_PROVIDER",
  "WHATSAPP_PROVIDER",
  "SMS_PROVIDER",
  "CUSTOM",
] as const;
export type PlatformKey = (typeof PLATFORMS)[number];

export const CATEGORIES = [
  "ADS",
  "ANALYTICS",
  "MESSAGING",
  "EMAIL",
  "CUSTOM",
] as const;
export type CategoryKey = (typeof CATEGORIES)[number];

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  META: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  TIKTOK: "TikTok Ads",
  X: "X (Twitter) Ads",
  GA4: "Google Analytics 4",
  TWILIO: "Twilio",
  EMAIL_PROVIDER: "موفر البريد الإلكتروني",
  WHATSAPP_PROVIDER: "موفر WhatsApp",
  SMS_PROVIDER: "موفر SMS",
  CUSTOM: "موفر مخصص",
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  ADS: "الإعلانات",
  ANALYTICS: "التحليلات",
  MESSAGING: "الرسائل",
  EMAIL: "البريد الإلكتروني",
  CUSTOM: "مخصص",
};

export const PLATFORM_CATEGORY: Record<PlatformKey, CategoryKey> = {
  META: "ADS",
  GOOGLE_ADS: "ADS",
  TIKTOK: "ADS",
  X: "ADS",
  GA4: "ANALYTICS",
  TWILIO: "MESSAGING",
  EMAIL_PROVIDER: "EMAIL",
  WHATSAPP_PROVIDER: "MESSAGING",
  SMS_PROVIDER: "MESSAGING",
  CUSTOM: "CUSTOM",
};

export const PLATFORM_ICON: Record<PlatformKey, ComponentType<{ className?: string }>> = {
  META: Facebook,
  GOOGLE_ADS: Globe,
  TIKTOK: Music2,
  X: Twitter,
  GA4: BarChart3,
  TWILIO: MessageSquare,
  EMAIL_PROVIDER: Mail,
  WHATSAPP_PROVIDER: MessageSquare,
  SMS_PROVIDER: MessageSquare,
  CUSTOM: Plug,
};

export const PLATFORM_ACCENT: Record<PlatformKey, string> = {
  META: "bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20",
  GOOGLE_ADS: "bg-[#EA4335]/10 text-[#EA4335] border-[#EA4335]/20",
  TIKTOK: "bg-slate-900/10 text-slate-900 border-slate-300",
  X: "bg-slate-900/10 text-slate-900 border-slate-300",
  GA4: "bg-amber-100 text-amber-700 border-amber-200",
  TWILIO: "bg-rose-100 text-rose-700 border-rose-200",
  EMAIL_PROVIDER: "bg-sky-100 text-sky-700 border-sky-200",
  WHATSAPP_PROVIDER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SMS_PROVIDER: "bg-violet-100 text-violet-700 border-violet-200",
  CUSTOM: "bg-slate-100 text-slate-600 border-slate-200",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  DISABLED: "موقوف",
  MISSING_CONFIG: "إعدادات ناقصة",
  AUTH_ERROR: "خطأ تسجيل دخول",
  PERMISSION_ERROR: "خطأ صلاحيات",
  SYNC_ERROR: "خطأ مزامنة",
  NOT_IMPLEMENTED: "لم يتم التنفيذ بعد",
};

export const STATUS_PILL: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISABLED: "bg-slate-50 text-slate-600 border-slate-200",
  MISSING_CONFIG: "bg-amber-50 text-amber-700 border-amber-200",
  AUTH_ERROR: "bg-rose-50 text-rose-700 border-rose-200",
  PERMISSION_ERROR: "bg-rose-50 text-rose-700 border-rose-200",
  SYNC_ERROR: "bg-rose-50 text-rose-700 border-rose-200",
  NOT_IMPLEMENTED: "bg-sky-50 text-sky-700 border-sky-200",
};
