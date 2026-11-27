/**
 * Below this share of the goal, raw "raised / goal" figures work against a project
 * ("$14 of $20,800" reads as "nobody trusts this"), so cards invite early support
 * and show the goal and donor count instead. Shared by CampaignCard and the hero
 * donation card so both switch at the same point.
 */
export const LOW_FUNDING_PERCENT = 10;

/**
 * Wraps a formatted amount ("$1,200") in Unicode LTR isolates so it keeps its
 * order inside right-to-left sentences ("تبرّع بـ $50", not "50$").
 */
export function isolateLtr(text: string): string {
  return `\u2066${text}\u2069`;
}
