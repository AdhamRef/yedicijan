import DonationFraudReview from "./DonationFraudReview";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import EmergencyMaintenanceControl from "./EmergencyMaintenanceControl";

export const dynamic = "force-dynamic";
export default async function SiteSecurityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/ar/auth/signin");
  if (session.user.role !== "ADMIN") {
    return <main className="p-6"><h1>غير مصرح بالوصول</h1></main>;
  }
  return (
    <main dir="rtl" className="space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">الأمان والحماية</h1>
      <EmergencyMaintenanceControl />
      <DonationFraudReview />
      <p className="text-sm text-slate-600">الحظر الآلي لمحاولات الدفع يخضع لاختبارات إضافية قبل تفعيله. وضع الصيانة منفصل عنه.</p>
    </main>
  );
}
