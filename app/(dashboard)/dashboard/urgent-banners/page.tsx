import { requireDashboardPagePermission } from "@/lib/dashboard/require-page-permission";
import { UrgentBannersClient } from "./UrgentBannersClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "البنرات العاجلة | يدي جيهان" };

export default async function UrgentBannersPage() {
  await requireDashboardPagePermission("campaigns");
  return <UrgentBannersClient />;
}
