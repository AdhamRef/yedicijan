"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import CategoryIcon, {
  CATEGORY_ICON_NAMES,
  flagIconValue,
  parseCategoryIcon,
} from "@/components/CategoryIcon";

/**
 * ISO 3166-1 alpha-2 codes, so every country the flag CDN publishes can be
 * picked. Names are resolved with Intl.DisplayNames instead of being listed
 * here — the browser already ships the Arabic country names.
 */
const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AW", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BQ",
  "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CF", "CG", "CH", "CI",
  "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CY", "CZ", "DE", "DJ",
  "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET", "FI", "FJ",
  "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GH", "GI", "GL", "GM",
  "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY", "HK", "HN", "HR", "HT",
  "HU", "ID", "IE", "IL", "IN", "IO", "IQ", "IR", "IS", "IT", "JM", "JO",
  "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA",
  "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MQ", "MR",
  "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NG", "NI",
  "NL", "NO", "NP", "NR", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK",
  "PL", "PM", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU",
  "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SI", "SK", "SL", "SM", "SN",
  "SO", "SR", "SS", "ST", "SV", "SY", "SZ", "TD", "TG", "TH", "TJ", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "US", "UY",
  "UZ", "VA", "VC", "VE", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA",
  "ZM", "ZW",
];

/** Shown first, before the full list — where the association works most. */
const PINNED_CODES = ["PS", "SY", "TR", "SD", "YE", "SO", "LB", "AF", "SA", "EG"];

function countryNames(locale: string): Record<string, string> {
  const names: Record<string, string> = {};
  try {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    for (const code of COUNTRY_CODES) {
      names[code] = display.of(code) || code;
    }
  } catch {
    for (const code of COUNTRY_CODES) names[code] = code;
  }
  return names;
}

/**
 * Picks what goes into `category.icon`: one of the built-in Lucide icons or any
 * country flag. Flags are stored as `flag:XX`; CategoryIcon also reads looser
 * forms, so a value typed by hand elsewhere still renders.
 */
export function CategoryIconPicker({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (next: string) => void;
}) {
  const parsed = parseCategoryIcon(value);
  const hasValue = Boolean(value?.trim());
  const [mode, setMode] = useState<"icon" | "flag">(
    hasValue && parsed.kind === "flag" ? "flag" : "icon",
  );
  const [query, setQuery] = useState("");

  const names = useMemo(() => countryNames("ar"), []);
  const englishNames = useMemo(() => countryNames("en"), []);

  const visibleCodes = useMemo(() => {
    const search = query.trim().toLowerCase();
    const ordered = [
      ...PINNED_CODES,
      ...COUNTRY_CODES.filter((code) => !PINNED_CODES.includes(code)),
    ];
    if (!search) return ordered;
    return ordered.filter((code) =>
      [code, names[code] || "", englishNames[code] || ""]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [query, names, englishNames]);

  const selectedCode = parsed.kind === "flag" ? parsed.countryCode : null;

  return (
    <div className="space-y-3">
      {hasValue && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
            <CategoryIcon name={value} className="w-5 h-5 text-brand" />
          </div>
          <span className="font-medium">
            {parsed.kind === "flag"
              ? `${names[parsed.countryCode] || parsed.countryCode} (${parsed.countryCode})`
              : parsed.name}
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="إزالة الأيقونة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="inline-flex rounded-lg border border-gray-200 p-1">
        {([
          { key: "icon", label: "أيقونة" },
          { key: "flag", label: "علم دولة" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === tab.key ? "bg-brand text-white" : "text-gray-500 hover:text-brand"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "icon" ? (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {CATEGORY_ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                parsed.kind === "lucide" && hasValue && parsed.name === name
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-200 text-gray-500 hover:border-brand/50 hover:text-brand"
              }`}
            >
              <CategoryIcon name={name} className="w-5 h-5" />
              <span className="text-[9px] leading-tight text-center truncate w-full">{name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الدولة أو رمزها (TR، فلسطين، Turkey)"
              className="w-full rounded-lg border border-gray-200 py-2 ps-9 pe-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>

          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
            {visibleCodes.map((code) => (
              <button
                key={code}
                type="button"
                title={`${names[code] || code} (${code})`}
                onClick={() => onChange(flagIconValue(code))}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  selectedCode === code
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-gray-200 text-gray-500 hover:border-brand/50 hover:text-brand"
                }`}
              >
                <CategoryIcon name={flagIconValue(code)} className="w-6 h-5" />
                <span className="text-[9px] leading-tight text-center truncate w-full">
                  {names[code] || code}
                </span>
              </button>
            ))}
            {visibleCodes.length === 0 && (
              <p className="col-span-full py-4 text-center text-xs text-gray-400">
                لا توجد دولة مطابقة.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryIconPicker;
