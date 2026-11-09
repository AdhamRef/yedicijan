import { redirect } from "next/navigation";
import Link from "next/link";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import LinkGeneratorPage from "../../link-generator/page";
import CampaignLinksPerformancePage from "../../marketing-intelligence/campaign-links/page";

export const metadata = { title: "الروابط والإسناد | لوحة التحكم" };
export const dynamic = "force-dynamic";

export default async function MarketingAttributionPage() {
  const access = resolveDashboardPageAccess(await getServerSession(authOptions), "referrals");
  if (!access.allowed) redirect(access.redirectTo);

  return (
    <main className="space-y-10" dir="rtl">
      {userHasDashboardPermission(access.session.user, "revenue") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <Link href="/dashboard/marketing/settled-attribution" className="font-medium text-blue-700 underline">عرض المقبوضات المؤكدة حسب مصدر التسويق</Link>
          <p className="mt-1 text-xs text-slate-600">يتطلب صلاحيات الإيرادات والإسناد. لا يشمل محاولات الدفع غير المؤكدة.</p>
        </section>
      )}
      <section id="builder" className="rounded-2xl border border-slate-200 bg-white">
        <LinkGeneratorPage />
      </section>
      <section id="links" className="rounded-2xl border border-slate-200 bg-white">
        <CampaignLinksPerformancePage />
      </section>
    </main>
  );
}
