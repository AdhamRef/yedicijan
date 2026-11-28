"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface Account {
  type: string;
  iban: string;
  /** The association publishes IBANs only; these are shown when known. */
  number?: string;
  ext?: string;
}

interface Bank {
  name: string;
  swift: string;
  accountName: string;
  accounts: Account[];
  branch?: string;
  logo?: string;
}

const ACCOUNT_HOLDER = "Yedicihan Uluslararası Yardımlaşma Derneği";

const BANKS: Bank[] = [
  {
    name: "Ziraat Katılım Bankası",
    swift: "ZKBATRIS",
    accountName: ACCOUNT_HOLDER,
    logo: "/ziraat-katilim.jpg",
    accounts: [
      { type: "TL", iban: "TR750020900001843729000001" },
      { type: "EUR", iban: "TR210020900001843729000003" },
      { type: "USD", iban: "TR480020900001843729000002" },
    ],
  },
  {
    name: "AlbarakaTürk Katılım Bankası",
    swift: "BTFHTRIS",
    accountName: ACCOUNT_HOLDER,
    accounts: [
      { type: "TL", iban: "TR710020300009942518000001" },
    ],
  },
];

const CURRENCY_STYLE: Record<string, string> = {
  TL: "bg-red-50 text-red-600 border border-red-200",
  USD: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  EUR: "bg-blue-50 text-blue-700 border border-blue-200",
};

function formatIBAN(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

function CopyButton({
  text,
  label,
  t,
}: {
  text: string;
  label?: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      // Icon-only on most rows: a screen reader needs the action and what is copied.
      aria-label={copied ? t("copied") : `${label ?? t("copy")}: ${text}`}
      className={`inline-flex min-h-8 min-w-8 items-center justify-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
        copied
          ? "border-green-200 bg-green-50 text-green-600"
          : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-burgundy hover:border-burgundy hover:text-white"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? t("copied") : label}</span>}
    </button>
  );
}

function BankCard({ bank, t }: { bank: Bank; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="bg-white border border-line rounded-[24px] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
        {bank.logo && (
          <div className="relative w-36 h-10 flex-shrink-0">
            <Image src={bank.logo} alt={bank.name} fill className="object-contain object-left" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900 leading-tight">{bank.name}</p>
          {bank.branch && (
            <p className="text-xs text-gray-400 mt-0.5">{t("branch")} {bank.branch}</p>
          )}
        </div>
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Swift / BIC</p>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            <p className="text-sm font-black text-gray-800 tracking-widest">{bank.swift}</p>
            <CopyButton text={bank.swift} t={t} />
          </div>
        </div>
      </div>

      {/* Swift — mobile only */}
      <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-offwhite border-b border-line">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Swift / BIC</p>
          <p className="text-sm font-black text-gray-800 tracking-widest mt-0.5">{bank.swift}</p>
        </div>
        <CopyButton text={bank.swift} t={t} />
      </div>

      {/* Account holder */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 bg-offwhite border-b border-line">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">{t("accountHolder")}</p>
          <p className="text-sm font-bold text-gray-900">{bank.accountName}</p>
        </div>
        <CopyButton text={bank.accountName} label={t("copy")} t={t} />
      </div>

      {/* Account rows */}
      <div className="divide-y divide-gray-100">
        {bank.accounts.map((acc) => (
          <div key={acc.iban} className="px-4 py-4 sm:px-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-md ${
                      CURRENCY_STYLE[acc.type] ?? "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {acc.type}
                  </span>
                  {acc.number && (
                    <span className="text-xs text-gray-400">
                      {t("accountNo")} <span className="text-gray-700 font-semibold">{acc.number}</span>
                    </span>
                  )}
                  {acc.ext && (
                    <span className="text-xs text-gray-400">
                      {t("extNo")} <span className="text-gray-700 font-semibold">{acc.ext}</span>
                    </span>
                  )}
                </div>
                <p className="font-mono text-[15px] font-black tracking-wider text-deep sm:text-base sm:tracking-widest" dir="ltr">
                  {formatIBAN(acc.iban)}
                </p>
              </div>
              <CopyButton text={acc.iban} label={t("copyIban")} t={t} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders the full list of banks + the contact-us footer.
 * Reused by /bank-transfer (manual flow) and /donation-failed (post-failure recovery).
 */
export default function BankAccountsBlock() {
  const t = useTranslations("BankTransfer");
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 space-y-5">
      {BANKS.map((bank) => (
        <BankCard key={bank.swift} bank={bank} t={t} />
      ))}
      <p className="text-center text-sm text-gray-400 pt-2">
        {t("footer")}{" "}
        <a href="mailto:info@yedicihan.org" className="text-burgundy font-semibold hover:underline">
          info@yedicihan.org
        </a>
      </p>
    </div>
  );
}
