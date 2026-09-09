import { describe, it, expect } from "vitest";
import { itineraryTranslator } from "@/i18n/publicMaterials/itinerary";
import { generatePDFContent } from "@/components/itinerary/ItineraryPDF";

const baseItinerary: any = {
  destination: "Lisboa",
  startDate: "2026-05-01",
  endDate: "2026-05-03",
  travelersCount: 2,
  tripType: "casal",
  budgetLevel: "luxo",
  days: [
    {
      dayNumber: 1,
      date: "2026-05-01",
      activities: [
        { id: "a1", period: "manha", title: "Passeio pelo agente", estimatedCost: "€ 90,00" },
      ],
    },
  ],
  passengers: [],
  passengerInterests: [],
  showDestinationIntro: false,
  showPricingSection: true,
  pricingContent: "<p>Condições digitadas pelo agente</p>",
};

describe("public itinerary i18n — extra system labels", () => {
  it("has new keys translated in both locales", () => {
    const pt = itineraryTranslator("pt-BR");
    const it = itineraryTranslator("it-IT");
    expect(pt("whatsappAria")).toBe("Falar no WhatsApp");
    expect(it("whatsappAria")).toBe("Scrivi su WhatsApp");
    expect(pt("whatsappMessageTemplate", { destination: "Roma" })).toBe(
      "Olá! Vi o roteiro para Roma e gostaria de mais informações."
    );
    expect(it("whatsappMessageTemplate", { destination: "Roma" })).toBe(
      "Ciao! Ho visto l'itinerario per Roma e vorrei maggiori informazioni."
    );
    expect(pt("documentFallbackName")).toBe("arquivo");
    expect(it("documentFallbackName")).toBe("file");
  });

  it("translates the PDF pricing section title without touching agent-typed content or currency", () => {
    const htmlPt = generatePDFContent(baseItinerary, null, undefined, "pt-BR");
    const htmlIt = generatePDFContent(baseItinerary, null, undefined, "it-IT");

    expect(htmlPt).toContain("Valores e Condições");
    expect(htmlIt).toContain("Prezzi e Condizioni");
    expect(htmlIt).not.toContain("Valores e Condições");

    // Agent free text and currency values stay untouched in both locales.
    expect(htmlPt).toContain("Condições digitadas pelo agente");
    expect(htmlIt).toContain("Condições digitadas pelo agente");
    expect(htmlPt).toContain("€ 90,00");
    expect(htmlIt).toContain("€ 90,00");
  });
});
