/**
 * Public IDs only. TrackingSettings remains the single source of truth for
 * existing pixels; the tag manager never reads or returns access tokens.
 * Legacy IDs are a transition fallback until the first explicit admin save.
 */
export type ManagedTag = { id: string | null; enabled: boolean; source: "legacy" | "database" };
export type ManagedTags = { clarity: ManagedTag; gtm: ManagedTag };
export type ManagedTagsUpdate = {
  clarityProjectId: string | null;
  clarityEnabled: boolean;
  gtmContainerId: string | null;
  gtmEnabled: boolean;
};
export const LEGACY_CLARITY_ID = "u614k028k2";
export const LEGACY_GTM_ID = "GTM-MMNBQQWB";

export function validClarityId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]{6,20}$/i.test(value);
}
export function validGtmId(value: unknown): value is string {
  return typeof value === "string" && /^GTM-[A-Z0-9]{4,12}$/.test(value);
}
export function validateManagedTagsInput(input: unknown): ManagedTagsUpdate {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid configuration");
  const body = input as Record<string, unknown>;
  const fields = ["clarityProjectId","clarityEnabled","gtmContainerId","gtmEnabled"];
  if (Object.keys(body).some(key => !fields.includes(key)) ||
      fields.some(key => !(key in body))) throw Error("Unsupported or missing settings field");
  const clarityProjectId = typeof body.clarityProjectId === "string" ?
    body.clarityProjectId.trim().toLowerCase() : body.clarityProjectId === null ? null : undefined;
  const gtmContainerId = typeof body.gtmContainerId === "string" ?
    body.gtmContainerId.trim().toUpperCase() : body.gtmContainerId === null ? null : undefined;
  if (clarityProjectId === undefined || gtmContainerId === undefined ||
      typeof body.clarityEnabled !== "boolean" || typeof body.gtmEnabled !== "boolean") {
    throw Error("Incorrect settings types");
  }
  if ((clarityProjectId !== null && !validClarityId(clarityProjectId)) ||
      (gtmContainerId !== null && !validGtmId(gtmContainerId)) ||
      (body.clarityEnabled && !clarityProjectId) || (body.gtmEnabled && !gtmContainerId)) {
    throw Error("Invalid Clarity project ID or GTM container ID");
  }
  return {
    clarityProjectId, clarityEnabled: body.clarityEnabled,
    gtmContainerId, gtmEnabled: body.gtmEnabled,
  };
}
export function effectiveManagedTags(
  row: Record<string, unknown> | null,
  legacyClarityId: string | undefined = LEGACY_CLARITY_ID,
  legacyGtmId: string | undefined = LEGACY_GTM_ID,
): ManagedTags {
  const claritySaved = typeof row?.clarityEnabled === "boolean" ||
    Object.prototype.hasOwnProperty.call(row || {}, "clarityProjectId");
  const gtmSaved = typeof row?.gtmEnabled === "boolean" ||
    Object.prototype.hasOwnProperty.call(row || {}, "gtmContainerId");
  const clarityCandidate = claritySaved ? row?.clarityProjectId : legacyClarityId;
  const gtmCandidate = gtmSaved ? row?.gtmContainerId : legacyGtmId;
  const clarityId = validClarityId(clarityCandidate) ? clarityCandidate.toLowerCase() : null;
  const gtmId = validGtmId(gtmCandidate) ? gtmCandidate : null;
  return {
    clarity: {
      id: clarityId, enabled: Boolean(clarityId && (claritySaved ? row?.clarityEnabled === true : true)),
      source: claritySaved ? "database" : "legacy",
    },
    gtm: {
      id: gtmId, enabled: Boolean(gtmId && (gtmSaved ? row?.gtmEnabled === true : true)),
      source: gtmSaved ? "database" : "legacy",
    },
  };
}

/** The browser only enables the opt-in marketing tags with affirmative consent. */
export function shouldLoadManagedTag(tag: ManagedTag, consent: string | null): boolean {
  return tag.enabled && Boolean(tag.id) && consent === "granted";
}
