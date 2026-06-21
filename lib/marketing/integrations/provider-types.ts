export type ProviderCategory =
  | "PIXELS_AND_APIS"
  | "AD_ACCOUNTS"
  | "ANALYTICS"
  | "MESSAGING"
  | "AI"
  | "INTERNAL";

export type ProviderCapability =
  | "BROWSER_PIXEL"
  | "SERVER_CONVERSIONS"
  | "REPORTING_API"
  | "AD_ACCOUNT_SYNC"
  | "ANALYTICS_REPORTING"
  | "MESSAGE_SENDING"
  | "DELIVERY_STATUS"
  | "AI_ASSISTANT"
  | "WEBHOOKS";

export type ReadinessLayer = "BROWSER" | "SERVER" | "REPORTING";

export type ProviderKey =
  | "meta"
  | "google_ads"
  | "ga4"
  | "tiktok"
  | "x_ads"
  | "twilio"
  | "netgsm"
  | "openai"
  | "email"
  | "whatsapp"
  | "internal_webhooks";

export interface OfficialDocReference {
  label: string;
  url: string;
}

export interface IntegrationProviderDefinition {
  key: ProviderKey;
  name: string;
  category: ProviderCategory;
  capabilities: ProviderCapability[];
  readinessLayers: ReadinessLayer[];
  officialDocs: OfficialDocReference[];
  notes: string;
  implementationStatus: "PLANNED" | "PARTIAL" | "READY";
}
