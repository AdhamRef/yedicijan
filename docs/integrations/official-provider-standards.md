# Official Provider Integration Standards

This document is the required checklist before adding any external provider integration.

## Purpose

External integrations must be based on official platform documentation, not memory, guesses, or copied snippets.

This protects the project from:

- unsupported fields,
- unsafe OAuth assumptions,
- leaked secrets,
- duplicate tracking,
- fake sync implementations,
- and UI states that claim a platform is connected when it is not ready.

## Required implementation order

1. Read the official provider documentation.
2. Identify the supported API product and version.
3. Identify required scopes, permissions, account ids, and tokens.
4. Define the provider capabilities in the provider catalog.
5. Define readiness checks before creating UI or sync jobs.
6. Keep secrets server-side only.
7. Add sync, events, or webhook code only after the provider contract is clear.
8. Add short internal comments explaining why the structure exists.

## Provider categories

### Pixels and APIs

Used for browser pixels, server conversion APIs, event APIs, tags, and internal API keys.

Examples:

- Meta Pixel and Conversions API
- Google Tag, GA4, and Google Ads conversions
- TikTok Pixel and Events API
- X Pixel
- OpenAI API
- Internal webhooks

### Ad and analytics accounts

Used for reporting, ad spend, campaign data, attribution comparison, and platform sync.

Examples:

- Meta Ads accounts
- Google Ads accounts
- GA4 properties
- TikTok advertiser accounts
- X Ads accounts

### Messaging providers

Used for scheduled messages, campaign sending, delivery status, and click tracking.

Routing rule:

- Turkey SMS should use Netgsm.
- International SMS should use Twilio.
- WhatsApp and email providers must be represented as separate capabilities.

## Readiness model

Every provider should expose readiness in three layers when applicable:

1. Browser readiness: pixel, tag, or client-side event support.
2. Server readiness: conversion API, Events API, webhook, or secure server-side calls.
3. Reporting readiness: ads, analytics, messages, delivery, or campaign data pull.

A provider can be configured but not ready. UI must show the difference.

## Security rules

- Never expose access tokens, refresh tokens, client secrets, developer tokens, or API secrets in client components.
- Store secrets only in server-side models, environment variables, or encrypted storage.
- Public runtime config may include only safe ids, such as pixel ids or public measurement ids.
- UI should show masked credentials and health states, not raw secrets.

## Coding rules

- Use a catalog entry before building provider UI.
- Keep provider metadata separate from API clients.
- Keep API clients separate from pages and components.
- Avoid duplicated hardcoded provider names across pages.
- Keep comments short and useful.
- Add links to official documentation in the catalog where possible.

## AI Core rule

The project should use one shared AI core API layer, with separate assistant contexts for:

- marketing,
- content and operations,
- archive,
- brand.

The UI may show different assistants, but the infrastructure should not duplicate AI provider logic.
