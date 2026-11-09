import type { Session } from "next-auth";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";

/**
 * Deleting a shared campaign image is an editorial operation, never an
 * authenticated-donor action. Upload remains separate because donors also
 * use /api/upload for profile photos.
 */
export function canDeleteCampaignMedia(session: Session | null): boolean {
  const user = session?.user;
  if (!user) return false;
  return userHasDashboardPermission(user, "campaigns")
    || userHasDashboardPermission(user, "slides")
    || userHasDashboardPermission(user, "blog");
}

/** Only public IDs *in the campaigns folder* may be deleted here. */
export function normalizeCampaignAssetId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const bare = trimmed.startsWith("campaigns/") ? trimmed.slice("campaigns/".length) : trimmed;
  // IDs used by the existing dashboard are last path segments, no subfolders.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(bare)) return null;
  return "campaigns/" + bare;
}
