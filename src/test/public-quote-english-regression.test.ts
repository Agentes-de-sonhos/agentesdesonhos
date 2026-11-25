import { describe, expect, it } from "vitest";
import { formatQuoteCurrency } from "@/lib/quoteCurrency";
import { buildServicePassengerLabel, formatPassengerComposition } from "@/lib/quotePassengers";
import { formatPublicShortDate, normalizePublicLocale, resolvePublicLocale } from "@/i18n/publicMaterials/locale";
import { serviceCompactDigest, serviceDigestDateLines, serviceDigestQuantity } from "@/lib/quoteServiceDigest";
import { buildBookingSelectionModel, bookingSelectionTotal, validateBookingContact } from "@/lib/quoteBookingSelection";
import { applyShowcaseSelection, buildBookingShowcase } from "@/lib/quoteBookingShowcase";
import { showcaseValidation } from "@/lib/quoteBookingShowcase";
import { buildServicePaymentConditions } from "@/lib/servicePaymentConditions";
import { buildToolSharePreview } from "@/lib/toolSharePreview";
import type { Quote, QuoteChoiceGroup, QuoteService } from "@/types/quote";

const flight = { id: "air", service_type: "flight", selection_mode: "required", amount: 2722, service_data: { airline: "Azul Linhas Aéreas", origin_city: "Campinas", destination_city: "Rio de Janeiro", departure_date: "2027-09-10", return_date: "2027-09-14", adults: 1 } } as unknown as QuoteService;
const hotel = (id: string, amount: number) => ({ id, service_type: "hotel", choice_group_id: "hotels", selection_mode: "alternative", amount, service_data: { hotel_name: "Windsor Copa Hotel", city: "Rio de Janeiro", check_in: "2027-09-10", check_out: "2027-09-14", rooms: [{ quantity: 1, adults: 1, children: 0, room_type: "Shared double room" }] } } as unknown as QuoteService);
const group = { id: "hotels", title: "Hotel", group_type: "alternative", min_select: 1, max_select: 1 } as QuoteChoiceGroup;
const services = [flight, hotel("h1", 5000), hotel("h2", 5610), hotel("h3", 6405)];
const quote = { id: "q", public_locale: "en-US", adults_count: 25, children_count: 0, infants_count: 0, currency: "BRL", show_detailed_prices: true, investment_summary_layout: "ungrouped", payment_display_mode: "installments", installments_count: 10, services } as unknown as Quote & { public_locale: string };

describe("English quote presentation without changing commercial data", () => {
  it("keeps BRL and exact amounts, changing only decimal/group separators", () => {
    expect(formatQuoteCurrency(2722, "BRL", "en-US")).toBe("R$2,722.00");
    expect(formatQuoteCurrency(6405, "BRL", "en-US")).toBe("R$6,405.00");
    expect(formatQuoteCurrency(2722, "BRL")).toBe("R$\u00a02.722,00");
  });
  it("uses US month/day order for both endpoints without moving calendar dates", () => {
    expect(serviceDigestDateLines(flight, "en-US").map(row => row.value)).toEqual(["09/10/2027", "09/14/2027"]);
    expect(formatPublicShortDate("2027-09-10", "it-IT")).toBe("10/09/2027");
    expect(formatPublicShortDate("2027-09-10", "pt-BR")).toBe("10/09/2027");
  });
  it("resolves the per-service adult count, not the group occupancy", () => {
    expect(buildServicePassengerLabel(services[1], quote, "en-US")).toBe("1 adult");
    expect(formatPassengerComposition({ adults: 25, children: 0, infants: 0 }, "en-US")).toBe("25 adults");
    expect(formatPassengerComposition({ adults: 1, children: 2, infants: 1 }, "en-US")).toBe("1 adult, 2 children, and 1 infant");
    expect(buildServicePassengerLabel(services[1], quote)).toBe("1 adulto");
  });
  it("derives room/ticket quantities from saved data rather than inventing occupancy", () => {
    expect(serviceDigestQuantity(services[1], "en-US")).toBe("1 room");
    expect(serviceDigestQuantity({ ...services[1], service_data: { rooms: [{ quantity: 2 }] } } as QuoteService, "en-US")).toBe("2 rooms");
    expect(serviceDigestQuantity({ ...flight, service_type: "attraction", service_data: { quantity: 25 } } as QuoteService, "en-US")).toBe("25 tickets");
  });
  it("preserves airline, hotel, place and agent-entered text in compact details", () => {
    const original = JSON.stringify(services);
    const digest = serviceCompactDigest(flight, "en-US");
    expect(digest.title).toBe("Azul Linhas Aéreas");
    expect(digest.location).toBe("Campinas → Rio de Janeiro");
    expect(serviceCompactDigest(services[1], "en-US").title).toBe("Windsor Copa Hotel");
    expect(JSON.stringify(services)).toBe(original);
  });
  it("preserves hotel exclusivity, deselection, request validation and totals across locales", () => {
    const model = buildBookingSelectionModel(quote, services, [group]);
    for (const locale of ["en-US", "pt-BR", "it-IT"]) {
      const showcase = buildBookingShowcase(model, [], [group], locale);
      const choice = showcase.blocks.find(block => block.kind === "choice");
      if (!choice) throw new Error("Missing hotel choice");
      const first = applyShowcaseSelection(choice, [], "h1");
      expect(first).toEqual(["h1"]);
      expect(bookingSelectionTotal(quote, model, first, locale).total).toBe(7722);
      const second = applyShowcaseSelection(choice, first, "h2");
      expect(second).toEqual(["h2"]);
      expect(bookingSelectionTotal(quote, model, second, locale).total).toBe(8332);
      expect(showcaseValidation(showcase, model, second, locale)).toBeNull();
      const none = applyShowcaseSelection(choice, second, "h2");
      expect(none).toEqual([]);
      expect(showcaseValidation(showcase, model, none, locale)).not.toBeNull();
    }
  });
  it("retains the existing installment math in English detail views", () => {
    const conditions = buildServicePaymentConditions(services[1], quote, value => formatQuoteCurrency(value, "BRL", "en-US"), "en-US");
    expect(conditions.amount).toBe(5000);
    expect(conditions.rows.map(row => row.value)).toEqual(["R$500.00"]);
  });
  it("keeps linked-client agreement and contact validation rules identical in every locale", () => {
    const input = { name: "", whatsapp: "", email: "", hasLinkedClient: true, disclaimerAccepted: false };
    for (const locale of ["en-US", "pt-BR", "it-IT"]) {
      expect(validateBookingContact(input, locale)).not.toBeNull();
      expect(validateBookingContact({ ...input, disclaimerAccepted: true }, locale)).toBeNull();
      expect(validateBookingContact({ ...input, hasLinkedClient: false, disclaimerAccepted: true }, locale)).not.toBeNull();
    }
  });
  it("uses the quote override before the agency default", () => {
    expect(normalizePublicLocale(quote.public_locale || resolvePublicLocale({ public_content_locale: "it-IT" }))).toBe("en-US");
  });
  it("localizes metadata date order while preserving proper names and other tool defaults", () => {
    const input = { kind: "quote" as const, destination: "Rio de Janeiro", clientName: "Hitomi", agencyName: "Via Lazer", startDate: "2027-09-10", endDate: "2027-09-14" };
    const en = buildToolSharePreview({ ...input, locale: "en-US" });
    expect(en.title).toContain("09/10 – 09/14");
    for (const name of ["Rio de Janeiro", "Hitomi", "Via Lazer"]) expect(en.title).toContain(name);
    expect(buildToolSharePreview(input).title).toContain("10/09 a 14/09");
  });
});
