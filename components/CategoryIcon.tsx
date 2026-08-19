import React from "react";
import ReactCountryFlag from "react-country-flag";
import {
  Heart, Users, BookOpen, Home, Droplets, Stethoscope,
  Baby, Globe, Building2, Star, Leaf, GraduationCap,
  Shirt, Zap, Handshake, Wheat, HandHeart, Church,
  Ambulance, TreePine, Lightbulb, ShieldCheck, Gift,
  LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Heart,
  Users,
  BookOpen,
  Home,
  Droplets,
  Stethoscope,
  Baby,
  Globe,
  Building2,
  Star,
  Leaf,
  GraduationCap,
  Shirt,
  Zap,
  Handshake,
  Wheat,
  HandHeart,
  Church,
  Ambulance,
  TreePine,
  Lightbulb,
  ShieldCheck,
  Gift,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[];

/**
 * The site's own locales and the flag each one is shown with — the same pairing
 * the dashboard language tabs already use. Applied only to a **lowercase**
 * token, so `ar` means العربية (السعودية) while `AR` means the Argentine flag.
 */
export const LOCALE_FLAGS: Record<string, string> = {
  ar: "SA",
  en: "GB",
  fr: "FR",
  tr: "TR",
  id: "ID",
  pt: "PT",
  es: "ES",
  de: "DE",
};

/** Canonical stored form for a flag, e.g. `flag:TR`. */
export function flagIconValue(countryCode: string): string {
  return `flag:${countryCode.toUpperCase()}`;
}

const FLAG_PREFIX = /^flag\s*[:_\-\s]\s*/i;
const REGIONAL_INDICATOR_A = 0x1f1e6;
const REGIONAL_INDICATOR_Z = 0x1f1ff;

/** 🇹🇷 → "TR". Flag emoji are two regional indicator symbols, nothing else. */
function countryCodeFromEmoji(value: string): string | null {
  const points = Array.from(value).map((character) => character.codePointAt(0) ?? 0);
  if (points.length !== 2) return null;
  if (points.some((point) => point < REGIONAL_INDICATOR_A || point > REGIONAL_INDICATOR_Z)) {
    return null;
  }
  return points
    .map((point) => String.fromCharCode(point - REGIONAL_INDICATOR_A + 65))
    .join("");
}

/** Accepts `TR`, `tr`, `ar-SA`, `en_GB`, or 🇹🇷 and returns an ISO 3166-1 code. */
function countryCodeFromToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const fromEmoji = countryCodeFromEmoji(trimmed);
  if (fromEmoji) return fromEmoji;

  const parts = trimmed.split(/[-_\s]+/).filter(Boolean);

  // A single lowercase token is read as a locale first, so `ar` resolves to the
  // Saudi flag rather than to Argentina.
  if (parts.length === 1 && parts[0] === parts[0].toLowerCase()) {
    const localeFlag = LOCALE_FLAGS[parts[0].toLowerCase()];
    if (localeFlag) return localeFlag;
  }

  // BCP-47 tags carry the country in the last subtag: ar-SA, en_GB, pt-BR.
  const region = parts[parts.length - 1];
  return /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : null;
}

export type CategoryIconValue =
  | { kind: "lucide"; name: string }
  | { kind: "flag"; countryCode: string };

/**
 * Resolves whatever is stored in `category.icon` into something renderable.
 *
 * A category icon is either one of the Lucide names above or a country flag,
 * and the flag half is deliberately permissive so hand-entered values work:
 * `flag:TR`, `flag-tr`, `flag TR`, a bare `TR`, a locale like `ar` or `en-GB`,
 * and a pasted 🇹🇷 all resolve to the same flag. Anything unrecognised falls
 * back to Heart, which is what this component has always done.
 */
export function parseCategoryIcon(raw?: string | null): CategoryIconValue {
  const value = (raw || "").trim();
  if (!value) return { kind: "lucide", name: "Heart" };

  if (CATEGORY_ICONS[value]) return { kind: "lucide", name: value };

  const lucideName = CATEGORY_ICON_NAMES.find(
    (name) => name.toLowerCase() === value.toLowerCase(),
  );
  if (lucideName) return { kind: "lucide", name: lucideName };

  const explicitFlag = FLAG_PREFIX.test(value);
  const countryCode = countryCodeFromToken(value.replace(FLAG_PREFIX, ""));
  if (countryCode) return { kind: "flag", countryCode };

  // `flag:` was asked for but the code is unusable — still better than pretending
  // it is an icon name.
  if (explicitFlag) return { kind: "lucide", name: "Globe" };

  return { kind: "lucide", name: "Heart" };
}

interface CategoryIconProps {
  name?: string | null;
  className?: string;
}

/**
 * Renders whatever `category.icon` holds — a Lucide icon or a country flag —
 * at the size the caller asks for. Flags come from react-country-flag, whose
 * `svg` mode hard-codes a 1em box in an inline style, so the flag is wrapped in
 * a span that carries the caller's sizing classes and filled to 100%.
 */
const CategoryIcon = ({ name, className = "w-4 h-4" }: CategoryIconProps) => {
  const icon = parseCategoryIcon(name);

  if (icon.kind === "flag") {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] ${className}`}
      >
        <ReactCountryFlag
          countryCode={icon.countryCode}
          svg
          alt=""
          aria-hidden
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </span>
    );
  }

  const Icon = CATEGORY_ICONS[icon.name] ?? Heart;
  return <Icon className={className} />;
};

export default CategoryIcon;
