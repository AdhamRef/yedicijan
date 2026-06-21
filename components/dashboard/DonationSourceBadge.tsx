"use client";

import { cn } from "@/lib/utils";
import {
  detectDonationSource,
  PLATFORM_LABEL_AR,
  STATUS_LABEL_AR,
  type DonationSourceResult,
  type DetectSourceInput,
} from "@/lib/attribution/detect-source";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DonationSourceBadgeProps extends DetectSourceInput {
  /** Hide the platform name when the surrounding column is already labeled. */
  compact?: boolean;
  className?: string;
}

const STATUS_DOT_CLASS: Record<DonationSourceResult["status"], string> = {
  verified: "bg-emerald-500",
  "utm-only": "bg-amber-400",
  "tracking-error": "bg-rose-500",
  organic: "bg-slate-300",
};

const STATUS_PILL_CLASS: Record<DonationSourceResult["status"], string> = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "utm-only": "bg-amber-50 text-amber-700 border-amber-200",
  "tracking-error": "bg-rose-50 text-rose-700 border-rose-200",
  organic: "bg-slate-50 text-slate-600 border-slate-200",
};

export function DonationSourceBadge({
  attribution,
  conversionEventsSentAt,
  conversionFailedEventsSentAt,
  status,
  compact = false,
  className,
}: DonationSourceBadgeProps) {
  const result = detectDonationSource({
    attribution,
    conversionEventsSentAt,
    conversionFailedEventsSentAt,
    status,
  });

  const platformLabel = PLATFORM_LABEL_AR[result.platform];
  const statusLabel = STATUS_LABEL_AR[result.status];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium leading-none whitespace-nowrap",
              STATUS_PILL_CLASS[result.status],
              className
            )}
          >
            <span
              className={cn("inline-block w-1.5 h-1.5 rounded-full", STATUS_DOT_CLASS[result.status])}
              aria-hidden
            />
            {compact ? statusLabel : platformLabel}
            {result.campaignName && !compact ? (
              <span className="text-slate-500 font-normal">· {result.campaignName}</span>
            ) : null}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-white text-slate-800 border border-slate-200 shadow-md p-3 space-y-1.5 text-right"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold">{platformLabel}</span>
            <span className="text-[10px] text-slate-500">{statusLabel}</span>
          </div>
          {result.campaignName ? (
            <div className="text-[11px] text-slate-600">
              <span className="text-slate-400">الحملة: </span>
              {result.campaignName}
            </div>
          ) : null}
          {result.placement ? (
            <div className="text-[11px] text-slate-600">
              <span className="text-slate-400">الموضع: </span>
              {result.placement}
            </div>
          ) : null}
          <div className="text-[11px] text-slate-600">
            <span className="text-slate-400">الثقة: </span>
            {result.confidence}%
          </div>
          {result.reasons.length > 0 ? (
            <ul className="text-[10.5px] text-slate-500 space-y-0.5 mt-1 border-t border-slate-100 pt-1.5">
              {result.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
