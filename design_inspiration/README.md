# Yedi Cihan Website Frontend

Static frontend implementation package built with HTML + Tailwind CSS.

## How to preview
Open `index.html` in a browser. Internet is required for Tailwind CDN, Google Fonts, and the remote Facebook image URLs.

## Pages
- `index.html` — Homepage
- `donation.html` — Donation flow UI
- `projects.html` — Projects listing
- `campaign-detail.html` — Campaign detail
- `trust.html` — Trust/About page
- `reports.html` — Reports page
- `bank-faq.html` — Bank accounts and FAQ
- `success.html` — Donation success state
- `error.html` — Payment error state

## Tech rules
- HTML5 + Tailwind CSS CDN
- No Bootstrap
- Optional migration to Next.js/shadcn is possible, but visual identity must remain the same
- Project cards are image-first: large image, title on image, no standalone red amount, suggested prices in one row

## Final content/assets to replace
- Official logo files
- Verified bank/IBAN data
- Approved KVKK/legal text
- Real project amounts if different from prototype values
- Remote image URLs can be downloaded and placed locally for production
