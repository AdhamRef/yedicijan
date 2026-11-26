"use client";

import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHero from "@/components/brand/PageHero";
import BankAccountsBlock from "./_components/BankAccountsBlock";

export default function BankTransferPage() {
  const t = useTranslations("BankTransfer");
  const tB = useTranslations("Brand");

  return (
    <main className="min-h-screen bg-offwhite">
      <PageHero
        crumbs={[{ href: "/", label: tB("home") }, { label: t("title") }]}
        eyebrow={t("badge")}
        title={t("title")}
        subtitle={t("subtitle")}
        aside={
          <div className="mx-auto hidden max-w-sm items-center gap-4 rounded-[24px] border border-line bg-white p-5 md:flex">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-deep text-gold">
              <CreditCard className="h-6 w-6" />
            </span>
            <p className="text-sm leading-6 text-gray-600">{t("notice")}</p>
          </div>
        }
      />
      <BankAccountsBlock />
    </main>
  );
}
