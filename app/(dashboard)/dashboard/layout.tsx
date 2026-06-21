import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import DashboardLayoutClient from "./DashboardLayoutClient";
import ar from "../../../i18n/messages/ar.json";

export const metadata: Metadata = {
  title: "لوحة التحكم | يدي چيهان",
  description: "إدارة المشاريع والتبرعات والمستخدمين",
  icons: { icon: "/yedicijan_logo.png" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const locale = "ar";
  const messages = (ar ?? {}) as unknown as Record<string, string | Record<string, string>>;

  return (
    <DashboardLayoutClient
      session={session}
      messages={messages}
      locale={locale}
    >
      {children}
    </DashboardLayoutClient>
  );
}
