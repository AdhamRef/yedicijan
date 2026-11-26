"use client";

import React from "react";
import { ArrowLeft, CalendarDays, Lock, ReceiptText, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

const ITEMS = [
  { Icon: CalendarDays, k: "t1" },
  { Icon: ShieldCheck, k: "t2" },
  { Icon: ReceiptText, k: "t3" },
  { Icon: Lock, k: "t4" },
] as const;

// Must match the accounts on /bank-transfer (BankAccountsBlock).
const BANKS = ["Ziraat Katılım", "Albaraka Türk"];

/** Specific, checkable trust signals instead of a "100% transparency" claim. */
export default function TrustBand() {
  const t = useTranslations("HomeRedesign");
  return (
    <section className="bg-offwhite pb-16 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-[28px] border border-line bg-white p-5 sm:gap-6 sm:p-8 lg:grid-cols-4">
          {ITEMS.map(({ Icon, k }) => (
            <div key={k} className="flex flex-col items-start gap-2.5 sm:flex-row sm:gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-offwhite text-burgundy sm:h-12 sm:w-12 sm:rounded-2xl">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <b className="block text-sm font-extrabold leading-snug text-deep sm:text-[15px]">{t(k)}</b>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500 sm:text-[13px]">{t(`${k}s`)}</span>
              </div>
            </div>
          ))}
          <div className="col-span-2 flex flex-wrap items-center gap-2.5 border-t border-line pt-4 sm:gap-3 sm:pt-5 lg:col-span-4">
            <small className="text-[13px] font-bold text-gray-500">{t("banksLabel")}</small>
            {BANKS.map((b) => (
              <span key={b} className="rounded-lg bg-offwhite px-3 py-1.5 font-poppins text-[13px] font-bold text-deep/80" dir="ltr">
                {b}
              </span>
            ))}
            <Link href="/bank-transfer" className="w-full pt-1 sm:ms-auto sm:w-auto sm:pt-0 inline-flex items-center gap-1.5 text-sm font-extrabold text-burgundy hover:text-burgundyDark">
              {t("ibanLink")}
              <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
