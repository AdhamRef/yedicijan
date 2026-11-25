import { buildNormalizedMessages, type LocaleMessages, type MessageObject } from "./message-quality";

import msg_ar from "./messages/ar.json";
import msg_tr from "./messages/tr.json";
import msg_en from "./messages/en.json";
import msg_fr from "./messages/fr.json";
import msg_de from "./messages/de.json";
import msg_es from "./messages/es.json";
import msg_id from "./messages/id.json";
import msg_pt from "./messages/pt.json";

/**
 * The normalized message catalog for every public locale.
 *
 * Extracted from `app/[locale]/layout.tsx` so the layout and the per-page
 * message providers read the same object  otherwise two copies of the
 * locale bundle would end up in the server graph. Yedicihan ships 8 locales.
 *
 * The map must stay statically imported (bundled JSON). When a locale is
 * promoted in `lib/locales.ts`, add its `import` above and an entry below.
 */
const raw: LocaleMessages = {
  ar: msg_ar, tr: msg_tr, en: msg_en, fr: msg_fr, de: msg_de,
  es: msg_es, id: msg_id, pt: msg_pt,
};

/** Gaps are filled from English  the handoff's `code → en → ar` chain. */
export const LOCALE_MESSAGES: LocaleMessages = buildNormalizedMessages(raw, "en");

export const DEFAULT_MESSAGE_LOCALE = "ar";

export function messagesFor(locale: string): MessageObject {
  return LOCALE_MESSAGES[locale] ?? LOCALE_MESSAGES[DEFAULT_MESSAGE_LOCALE];
}

/**
 * Namespaces the site shell needs on every page: the header's navigation and
 * language picker, the footer, the quick-donation widget, system states and
 * form validation.
 *
 * `PERFORMANCE_BUDGET.md` sets the rule this exists to satisfy  "حزم الترجمة:
 * Locale الحالية × Namespaces الصفحة فقط". Sending all 23 namespaces on every
 * page put ~129KB of JSON in each document; the shell is ~14KB and a page adds
 * only what it actually renders.
 */
/* `Concierge` rides in the shell: the donation concierge's launcher is mounted
   by the layout and its page-level entry points sit inside pages' own
   providers, which replace rather than extend the layout's messages.
   `ProjectShares` rides with `projects` for the same reason: the project card
   that needs it is rendered on pages across the site.
   `CategoryNav` is the header's projects dropdown and the footer's categories
   band, both on every page. `CardGive` is that card's frequency dialog and
   added-to-basket toast. */
export const SHELL_NAMESPACES = ["common", "navigation", "system", "validation", "projects", "Concierge", "ProjectShares", "CategoryNav", "CardGive", "Navbar"] as const;

/**
 * Legacy namespaces belonging to the pre-Minbar public pages. Their route
 * layouts use LegacyMessages; the public shell no longer ships this catalog
 * on every page. Remove namespaces as their last legacy consumers are ported.
 */
export const LEGACY_NAMESPACES = [
  "BankTransfer", "DonationFailed", "BlogCard", "Navbar", "HomePage", "HeroSlider",
  "CampaignsSlider", "QuickDonate", "Footer", "AboutUs", "ContactUs", "Blog",
  "CampaignsPage", "Campaign", "SignInDialog", "SharePopup", "DonationDialog",
  "DonationSuccess", "CartSheet", "LiveDonationsTicker", "Profile",
  "MessageSubjects", "CompleteProfile",
  // The donor's account page names a plan's cadence and its failed state.
  "Recurring",
] as const;

/** Narrow a locale's catalog to the given namespaces. Unknown names are skipped. */
export function pickNamespaces(
  locale: string,
  namespaces: readonly string[]
): MessageObject {
  const all = messagesFor(locale);
  const out: MessageObject = {};
  for (const ns of namespaces) {
    if (all[ns] !== undefined) out[ns] = all[ns];
  }
  return out;
}
