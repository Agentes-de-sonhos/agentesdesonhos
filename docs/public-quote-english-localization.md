# Public quotation US English localization

## Result
The existing quote locale now reaches the shared public quotation UI, booking cart and item details instead of falling back to hardcoded Portuguese. No token-specific production condition was added. The quote's English override remains authoritative; the agency locale remains the fallback.

Implemented coverage:
- Full booking-request agreement paragraph, acceptance prompt, selected-services total, booking CTA and contact/selection validation.
- Locale propagation into compact selected-service digests, service-type chips, room/ticket/pax quantities, dates and ranges, and all item details.
- US-English date and BRL amount formatting, including flight month labels; no conversion or arithmetic changes.
- Service-image captions, original Google Maps contributor credits, previous/next/close controls, image alternatives and illustrative-image fallback.
- Service count in section headers, service passenger composition, journey ARIA labels, generated consultant-title fallback and prepared WhatsApp message.
- Locale-aware quotation page title, metadata description, Open Graph/Twitter metadata and document language; other tool previews keep their existing defaults.
- Attachment viewer labels and feedback; standard hotel rate/refund labels accept the explicit public locale.
- English booking confirmation and safe English failure feedback, with the same request contract.

## Preserved
Company, hotel, person and place names; agent-entered content; source credits and photo order; BRL amounts; payment formulas and terms; travel dates; occupancy; required/optional services; hotel exclusivity and deselection; booking request validation and payload. Existing callers without a locale retain their defaults. No agency/quote records, database schema, functions, unrelated apps or mockups were changed. No actual request or WhatsApp message was sent. No publication was performed.

## Browser verification
Read the real existing quote at `/orcamento/8427d60c4e73464c934234a8ca6bb304` in the local application with live public data, not a mockup.

Verified desktop, 393 × 852 mobile, and the optional new visual:
- Expanded flight, three hotels, transfer and both attractions, plus information/itinerary blocks.
- Selected each hotel, opened every selected item's View details dialog and closed it; all seven distinct service detail contents were checked.
- Totals read back as R$7,722.00, R$8,332.00 and R$9,127.00 for the respective saved hotel options.
- Agreement paragraph entirely English; checking it enables the existing submit button. The submit button was never clicked in browser verification.
- Removing the hotel restores the existing required-choice validation in English.
- Signature and prepared WhatsApp message in English; proper names retained.
- English metadata/date order and `en-US` document language.
- No page runtime errors and no calls to the live booking submission endpoint.
- Hotel photo attribution visibly reads “Photos: Google Maps” while retaining the original contributor names/links.

Confirmation and failure responses were checked with a mocked request service in a regression test, not through a real booking submission. The deployed URL still needs publication to receive these frontend changes; server-generated crawler responses were not changed.

## Tests
**125 tests passed in 11 focused test files.** Automatic preview build: **OK**. `git diff --check`: clean.

```text
bunx vitest run \
  src/test/public-quote-english-regression.test.ts \
  src/test/public-quote-english-booking.test.tsx \
  src/test/public-locale-core.test.ts \
  src/test/public-locale-quote.test.ts \
  src/test/public-locale-quote-surfaces.test.ts \
  src/test/quote-booking-selection.test.ts \
  src/test/quote-booking-showcase.test.ts \
  src/test/quote-service-passengers.test.ts \
  src/test/quote-service-digest.test.ts \
  src/test/tool-share-preview.test.ts \
  src/test/booking-cart-inline.test.tsx
```

Two new regression files cover formatting, unchanged commercial values/occupancy/selection rules, proper-name preservation, mocked confirmation and safe English error feedback. An obsolete exact-markup assertion in the digest test was replaced by a behavioral photo-order preservation check.

## Exact changed files

- `docs/public-quote-english-localization.md`
- `roadmap.md`
- `src/components/quote/PublicDocumentViewer.tsx`
- `src/components/quote/PublicSectionAccordion.tsx`
- `src/components/quote/ServiceDigestCompact.tsx`
- `src/components/quote/ServiceImageCarousel.tsx`
- `src/components/quote/booking/BookingCartContext.tsx`
- `src/components/quote/booking/BookingCartDialog.tsx`
- `src/components/quote/booking/BookingServiceDetails.tsx`
- `src/components/quote/modern/ModernFlightTickets.tsx`
- `src/i18n/publicMaterials/quote.ts`
- `src/lib/attractionFareComposition.ts`
- `src/lib/hotelRates.ts`
- `src/lib/hotelRefundPolicy.ts`
- `src/lib/quoteBookingSelection.ts`
- `src/lib/quoteBookingShowcase.ts`
- `src/lib/quoteCurrency.ts`
- `src/lib/quotePassengers.ts`
- `src/lib/quoteServiceDigest.ts`
- `src/lib/toolSharePreview.ts`
- `src/pages/OrcamentoPublico.tsx`
- `src/test/public-quote-english-booking.test.tsx`
- `src/test/public-quote-english-regression.test.ts`
- `src/test/quote-service-digest.test.ts`
