import type { ComponentType, SVGProps } from "react";

export type PageContentSection = { title?: string; description: string };
export type AboutPageType = {
  general: { title: string; subTitle?: string; description: string; paragraphs: PageContentSection[] };
  features: Array<{ name: string; description: string; icon: ComponentType<SVGProps<SVGSVGElement>> }>;
};
export type PolicyPageType = { title: string; description: string; paragraphs: PageContentSection[] };
export type TermsPageType = { title: string; description: string; paragraphs: PageContentSection[] };
