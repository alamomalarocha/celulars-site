# Visual Direction Correction Report

## Scope

Correction applied after the first Apple-inspired cleanup to make the site clearer, more commercial and more CELULARS-branded.

Pages reviewed:

- `index.html`
- `iphones.html`
- `atacado.html`
- `sobre.html`
- `contato.html`

## Files Changed

- `index.html`
- `iphones.html`
- `atacado.html`
- `sobre.html`
- `contato.html`
- `visual-direction.css`
- `visual-direction.js`
- `design-system/device-visual-system/VISUAL_DIRECTION_CORRECTION_REPORT.md`

## Header

- Header keeps the clean standalone CELULARS symbol.
- Header search remains active.
- The full horizontal CELULARS logo was restored in the Home hero, not in the compact menu.

## Full Logo Placement

The full CELULARS wordmark appears in the Home hero using:

- `brand-assets/celulars-official-logos/header/celulars-logo-horizontal-blue.png`

This restores brand recognition without making the global navigation heavy.

## PTAX / CELULARS Rate Card

The existing PTAX blocks were not recalculated or modified in logic.

Visual-only correction:

- PTAX reference blocks are repositioned into the top hero area where possible.
- The card is more compact.
- The value is visually emphasized.
- Long notes are reduced visually with smaller text.

The same `data-cel-*` hooks remain in place for the current PTAX script.

## Home Improvements

- Hero headline now communicates the core business faster: iPhones novos e eCPO in Miami with Brazil-facing service.
- Hero buttons were enlarged.
- A three-card clarity section was added immediately after the hero:
  - iPhones novos
  - iPhones eCPO
  - Atendimento pelo WhatsApp
- Existing iPhone imagery remains local and lightweight.

## iPhones Improvements

- The premium table layout remains unchanged.
- The top exchange card receives the compact rate-card treatment.
- The page keeps a visual iPhone banner above the table without reintroducing per-row product images.

## Atacado Improvements

- The public local page keeps the B2B hero and access flow.
- Published `/atacado` remains protected by Cloudflare Access.
- The PTAX reference is visually compact and moved to the top hero area locally.
- No internal wholesale data was exposed by this change.

## Sobre Improvements

- The top section now supports the same compact rate-card layout.
- Existing visual image block is preserved.
- Long institutional content remains divided into sections.

## Contato Improvements

- The top section now supports the same compact rate-card layout.
- Existing WhatsApp/phone emphasis remains.
- Contact image remains lightweight and local.

## Images Used

No new image file was added.

Existing local assets used:

- `assets/images/iphones/iphone-17-pro-max-silver.webp`
- `assets/images/iphones/iphone-17-pro-deep-blue.webp`
- `assets/images/iphones/iphone-17-mist-blue.webp`
- `assets/images/iphones/iphone-air-space-black.webp`
- `brand-assets/celulars-official-logos/header/celulars-logo-horizontal-blue.png`

No hotlinking was introduced.

## Text Reorganization

- Home hero text was shortened and clarified.
- The new Home clarity section reduces the need for the user to infer what CELULARS offers.
- PTAX/reference notes remain available but visually less dominant.

## Validation

Local browser validation was run with Chrome at:

- desktop: 1280 px
- tablet: 768 px
- mobile: 430 px
- mobile: 390 px

Checklist:

- Full logo visible in Home hero: passed
- Header symbol clean: passed
- Hero buttons larger: passed
- PTAX compact card: passed
- iPhones table functional: passed
- WhatsApp functional: passed
- Home impact counter only on Home: passed
- No public `CDVS` text: passed
- No Apple partnership/authorization language: passed
- No broken images: passed
- No console errors: passed
- No horizontal overflow: passed

Published validation was run using:

- `https://celulars.com.br?visual-direction=1`
- `https://celulars.com.br/iphones?visual-direction=1`
- `https://celulars.com.br/sobre?visual-direction=1`
- `https://celulars.com.br/contato?visual-direction=1`
- `https://celulars.com.br/atacado?visual-direction=1`

Published results:

- Home: full logo in hero, header symbol, compact rate card, PTAX, WhatsApp, impact counter and mobile width passed.
- iPhones: compact rate card, 26-row premium table, PTAX, WhatsApp, search and mobile width passed.
- Sobre: compact rate card, PTAX, WhatsApp, search and mobile width passed.
- Contato: compact rate card, PTAX, WhatsApp, search and mobile width passed.
- Atacado: published page remains protected by Cloudflare Access. The Cloudflare Access sign-in page produced a CSP warning for Cloudflare's own embedded image, unrelated to CELULARS site code.

## Next Suggested Adjustments

- Consider simplifying the long institutional copy on Sobre in a future content-only pass.
- Consider a dedicated Home hero illustration once final brand/product imagery is approved.
