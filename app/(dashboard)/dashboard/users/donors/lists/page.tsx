import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { DonorSegmentsClient } from "./DonorSegmentsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "قوائم المتبرعين | يدي جيهان" };

export default async function DonorSegmentsPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "donors");
  if (!access.allowed) redirect(access.redirectTo);
  return <DonorSegmentsClient />;
}
