import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";
import EmergencySwitch from "./EmergencySwitch";
export const dynamic = "force-dynamic";
/** Admin only. Yedicihan has the emergency switch here; Minber's IP/country rules are not ported. */
export default async function SecurityPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");
  return <EmergencySwitch />;
}
