import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { resolveDashboardFallbackHref } from "@/lib/dashboard/page-access";
import { SettledAttributionClient } from "./SettledAttributionClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "المقبوضات المؤكدة حسب المصدر | يدي جيهان" };

export default async function SettledAttributionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/ar/auth/signin");
  if (!userHasDashboardPermission(session.user, "revenue") ||
      !userHasDashboardPermission(session.user, "referrals")) {
    redirect(resolveDashboardFallbackHref(session));
  }
  return <SettledAttributionClient />;
}
