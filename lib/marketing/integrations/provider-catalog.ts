import type { IntegrationProviderDefinition } from "./provider-types";

// Central provider catalog for Marketing, Content Scheduling, AI, and Archive.
// Keep this file as metadata only: no secrets, no OAuth logic, and no API clients here.
export const integrationProviderCatalog: IntegrationProviderDefinition[] = [
  {
    key: "meta",
    name: "Meta",
    category: "PIXELS_AND_APIS",
    capabilities: ["BROWSER_PIXEL", "SERVER_CONVERSIONS", "REPORTING_API", "AD_ACCOUNT_SYNC"],
    readinessLayers: ["BROWSER", "SERVER", "REPORTING"],
    officialDocs: [
      { label: "Meta Pixel", url: "https://developers.facebook.com/docs/meta-pixel/" },
      { label: "Conversions API", url: "https://developers.facebook.com/docs/marketing-api/conversions-api/" },
      { label: "Marketing API Insights", url: "https://developers.facebook.com/docs/marketing-api/insights/" },
    ],
    notes: "Use Meta for pixel events, server conversions, ad account reporting, and campaign/adset/ad insights.",
    implementationStatus: "PARTIAL",
  },
  {
    key: "google_ads",
    name: "Google Ads",
    category: "AD_ACCOUNTS",
    capabilities: ["REPORTING_API", "AD_ACCOUNT_SYNC", "SERVER_CONVERSIONS"],
    readinessLayers: ["SERVER", "REPORTING"],
    officialDocs: [
      { label: "Google Ads API", url: "https://developers.google.com/google-ads/api/docs/start" },
      { label: "Google Ads Query Language", url: "https://developers.google.com/google-ads/api/docs/query/overview" },
      { label: "Conversion uploads", url: "https://developers.google.com/google-ads/api/docs/conversions/overview" },
    ],
    notes: "Use GAQL for campaign, ad group, ad, spend, click, and conversion reporting before building sync clients.",
    implementationStatus: "PLANNED",
  },
  {
    key: "ga4",
    name: "Google Analytics 4",
    category: "ANALYTICS",
    capabilities: ["ANALYTICS_REPORTING", "REPORTING_API", "SERVER_CONVERSIONS"],
    readinessLayers: ["SERVER", "REPORTING"],
    officialDocs: [
      { label: "GA4 Data API", url: "https://developers.google.com/analytics/devguides/reporting/data/v1" },
      { label: "Measurement Protocol", url: "https://developers.google.com/analytics/devguides/collection/protocol/ga4" },
    ],
    notes: "Use GA4 as journey analytics, not as the financial source of truth. Paid donations remain the revenue truth.",
    implementationStatus: "PLANNED",
  },
  {
    key: "tiktok",
    name: "TikTok",
    category: "PIXELS_AND_APIS",
    capabilities: ["BROWSER_PIXEL", "SERVER_CONVERSIONS", "REPORTING_API", "AD_ACCOUNT_SYNC"],
    readinessLayers: ["BROWSER", "SERVER", "REPORTING"],
    officialDocs: [
      { label: "TikTok Events API", url: "https://business-api.tiktok.com/portal/docs?id=1739584855420929" },
      { label: "TikTok Reporting API", url: "https://business-api.tiktok.com/portal/docs?id=1738864915188737" },
    ],
    notes: "Use TikTok Events API for CompletePayment and Reports API for campaign/adgroup/ad performance.",
    implementationStatus: "PLANNED",
  },
  {
    key: "x_ads",
    name: "X Ads",
    category: "AD_ACCOUNTS",
    capabilities: ["BROWSER_PIXEL", "REPORTING_API", "AD_ACCOUNT_SYNC"],
    readinessLayers: ["BROWSER", "REPORTING"],
    officialDocs: [
      { label: "X Ads API", url: "https://developer.x.com/en/docs/x-ads-api" },
      { label: "X Pixel", url: "https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html" },
    ],
    notes: "Start with browser tracking and reporting only. Server conversion support depends on account/API access.",
    implementationStatus: "PLANNED",
  },
  {
    key: "twilio",
    name: "Twilio",
    category: "MESSAGING",
    capabilities: ["MESSAGE_SENDING", "DELIVERY_STATUS", "WEBHOOKS"],
    readinessLayers: ["SERVER", "REPORTING"],
    officialDocs: [
      { label: "Twilio Messaging", url: "https://www.twilio.com/docs/messaging" },
      { label: "Twilio Status Callbacks", url: "https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks" },
    ],
    notes: "Use Twilio for international SMS or WhatsApp flows where enabled. Turkey SMS should route to Netgsm.",
    implementationStatus: "PARTIAL",
  },
  {
    key: "netgsm",
    name: "Netgsm",
    category: "MESSAGING",
    capabilities: ["MESSAGE_SENDING", "DELIVERY_STATUS", "WEBHOOKS"],
    readinessLayers: ["SERVER", "REPORTING"],
    officialDocs: [
      { label: "Netgsm Developer Docs", url: "https://www.netgsm.com.tr/dokuman" },
    ],
    notes: "Primary SMS provider for Turkey. Keep routing rules separate from Twilio international SMS.",
    implementationStatus: "PLANNED",
  },
  {
    key: "openai",
    name: "OpenAI",
    category: "AI",
    capabilities: ["AI_ASSISTANT"],
    readinessLayers: ["SERVER"],
    officialDocs: [
      { label: "OpenAI API docs", url: "https://platform.openai.com/docs" },
    ],
    notes: "One shared AI core should serve separate assistant contexts for marketing, content, archive, and brand.",
    implementationStatus: "PLANNED",
  },
  {
    key: "email",
    name: "Email Provider",
    category: "MESSAGING",
    capabilities: ["MESSAGE_SENDING", "DELIVERY_STATUS", "WEBHOOKS"],
    readinessLayers: ["SERVER", "REPORTING"],
    officialDocs: [],
    notes: "Use this generic entry until the final email provider is selected and documented from official sources.",
    implementationStatus: "PLANNED",
  },
  {
    key: "whatsapp",
    name: "WhatsApp Provider",
    category: "MESSAGING",
    capabilities: ["MESSAGE_SENDING", "DELIVERY_STATUS", "WEBHOOKS"],
    readinessLayers: ["SERVER", "REPORTING"],
    officialDocs: [
      { label: "WhatsApp Business Platform", url: "https://developers.facebook.com/docs/whatsapp" },
    ],
    notes: "Represent WhatsApp separately from SMS because templates, approvals, and delivery states differ.",
    implementationStatus: "PLANNED",
  },
  {
    key: "internal_webhooks",
    name: "Internal Webhooks",
    category: "INTERNAL",
    capabilities: ["WEBHOOKS"],
    readinessLayers: ["SERVER"],
    officialDocs: [],
    notes: "Use for internal automation, scheduler events, and cross-system handoff events.",
    implementationStatus: "PLANNED",
  },
];

export function getProvidersByCategory(category: IntegrationProviderDefinition["category"]) {
  return integrationProviderCatalog.filter((provider) => provider.category === category);
}

export function getProviderByKey(key: IntegrationProviderDefinition["key"]) {
  return integrationProviderCatalog.find((provider) => provider.key === key);
}
