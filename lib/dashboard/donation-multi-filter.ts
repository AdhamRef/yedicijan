/**
 * Dashboard donation filters that accept several values (ported from Minber al-Aqsa #282).
 * "a,b,c" means any of them; one value gives exactly the same condition as before,
 * so a single-value filter behaves as it always did.
 *
 * MongoDB + Prisma: the "__unset" option matches null and empty values.
 */
type Where = Record<string, unknown>;

/** "a,b" → ["a","b"]; "all", empty and duplicates are dropped. */
export function multiValues(raw: string | null | undefined): string[] {
  return [...new Set(String(raw ?? "").split(",").map((v) => v.trim()).filter((v) => v && v !== "all"))];
}

function anyOf(raw: string | null | undefined, one: (v: string) => Where | null): Where | null {
  const values = multiValues(raw);
  if (values.length <= 1) return values[0] ? one(values[0]) : null;
  const parts = values.map(one).filter((w): w is Where => w !== null);
  return parts.length === 0 ? null : parts.length === 1 ? parts[0] : { OR: parts };
}

export function donationLocaleWhere(raw: string | null | undefined): Where | null {
  return anyOf(raw, (v) => (v === "__unset" ? { OR: [{ locale: null }, { locale: "" }] } : { locale: v }));
}

export function donationCountryWhere(raw: string | null | undefined): Where | null {
  return anyOf(raw, (v) =>
    v === "__unset" ? { OR: [{ donorCountryCode: null }, { donorCountryCode: "" }] } : { donorCountryCode: v.toUpperCase() },
  );
}

/** One id stays a plain equality; several become `{ in: [...] }`. */
export function idOrIn(raw: string | null | undefined): string | { in: string[] } | null {
  const ids = multiValues(raw);
  return ids.length === 0 ? null : ids.length === 1 ? ids[0] : { in: ids };
}

/** Donations with an item in any of these projects. */
export function donationCampaignWhere(raw: string | null | undefined): Where | null {
  const id = idOrIn(raw);
  return id === null ? null : { items: { some: { campaignId: id } } };
}

/** Donations to any of these categories: through a project in the category, or a direct category item. */
export function donationCategoryWhere(raw: string | null | undefined): Where | null {
  const ids = multiValues(raw);
  if (ids.length === 0) return null;
  const campaignInCategory = ids.length === 1 ? { categoryIds: { has: ids[0] } } : { categoryIds: { hasSome: ids } };
  return {
    OR: [
      { items: { some: { campaign: campaignInCategory } } },
      { categoryItems: { some: { categoryId: ids.length === 1 ? ids[0] : { in: ids } } } },
    ],
  };
}

/** For DonationItem rows: a project id condition, or the projects of a category. */
export function campaignCategoryWhere(raw: string | null | undefined): Where | null {
  const ids = multiValues(raw);
  if (ids.length === 0) return null;
  return { categoryIds: ids.length === 1 ? { has: ids[0] } : { hasSome: ids } };
}
