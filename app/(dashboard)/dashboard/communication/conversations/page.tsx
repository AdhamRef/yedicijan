import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { resolveDashboardPageAccess } from "@/lib/dashboard/page-access";
import { ConversationsWorkspace } from "./_components/ConversationsWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "محادثات واتساب | التواصل" };

/**
 * WhatsApp conversations (ported from Minber al-Aqsa #256…#289): language tabs, assignment, quick replies,
 * replies inside the 24-hour window and approved templates after it. A new section beside the contact-form
 * inbox (/dashboard/inbox), which stays as it is. Same permission as the communication pages.
 */
export default async function ConversationsPage() {
  const session = await getServerSession(authOptions);
  const access = resolveDashboardPageAccess(session, "messages");
  if (!access.allowed) redirect(access.redirectTo);
  return <ConversationsWorkspace currentUserId={session?.user?.id ?? null} />;
}
