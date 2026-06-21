import type { ReactNode } from "react";
import { CampaignLinkRegistryBridge } from "./CampaignLinkRegistryBridge";

export default function LinkGeneratorLayout({ children }: { children: ReactNode }) {
  return <>
    {children}
    <CampaignLinkRegistryBridge />
  </>;
}
