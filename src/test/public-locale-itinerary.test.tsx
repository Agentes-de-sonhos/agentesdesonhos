import { describe, it, expect } from "vitest";
import {
  itineraryTranslator,
  daysCountLabel,
  tripTypeLabel,
  budgetLabel,
  periodLabel,
} from "@/i18n/publicMaterials/itinerary";
import { generatePDFContent } from "@/components/itinerary/ItineraryPDF";

const baseItinerary: any = {
  destination: "Roma",
  startDate: "2026-09-08",
  endDate: "2026-09-10",
  travelersCount: 2,
  tripType: "casal",
  budgetLevel: "conforto",
  days: [
    {
      dayNumber: 1,
      date: "2026-09-08",
      activities: [
        { id: "a1", period: "manha", title: "Título digitado pelo agente", description: "Descrição livre do agente" },
      ],
    },
  ],
  passengers: [],
  passengerInterests: [],
  showDestinationIntro: false,
  showPricingSection: false,
};

describe("public itinerary i18n", () => {
  it("falls back to pt-BR for missing/unknown locale", () => {
    const t = itineraryTranslator(null);
    expect(t("dayByDayTitle")).toBe("Dia a Dia");
    expect(itineraryTranslator("xx-XX" as any)("dayByDayTitle")).toBe("Dia a Dia");
  });

  it("selects it-IT texts for main labels", () => {
    const t = itineraryTranslator("it-IT");
    expect(t("dayByDayTitle")).toBe("Giorno per Giorno");
    expect(t("pricingSectionTitle")).toBe("Prezzi e Condizioni");
    expect(tripTypeLabel("it-IT", "casal")).toBe("Viaggio di Coppia");
    expect(budgetLabel("it-IT", "conforto")).toBe("Comfort");
    expect(periodLabel("it-IT", "manha")).toBe("Mattina");
  });

  it("localizes days plural (dia/dias vs giorno/giorni)", () => {
    expect(daysCountLabel("pt-BR", 1)).toBe("1 dia");
    expect(daysCountLabel("pt-BR", 3)).toBe("3 dias");
    expect(daysCountLabel("it-IT", 1)).toBe("1 giorno");
    expect(daysCountLabel("it-IT", 3)).toBe("3 giorni");
  });

  it("renders PDF chrome in pt-BR by default", () => {
    const html = generatePDFContent(baseItinerary);
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("Programação Dia a Dia");
    expect(html).toContain("Título digitado pelo agente");
    expect(html).toContain("Descrição livre do agente");
  });

  it("renders PDF chrome in it-IT while keeping agent free text untranslated", () => {
    const html = generatePDFContent(baseItinerary, null, undefined, "it-IT");
    expect(html).toContain('lang="it-IT"');
    expect(html).toContain("Programma Giorno per Giorno");
    expect(html).toContain("Mattina");
    expect(html).toContain("Título digitado pelo agente");
    expect(html).toContain("Descrição livre do agente");
  });

  it("does not change amount/currency formatting", () => {
    const withCost: any = {
      ...baseItinerary,
      days: [
        {
          dayNumber: 1,
          date: "2026-09-08",
          activities: [
            { id: "a1", period: "manha", title: "Passeio", estimatedCost: "R$ 150,00" },
          ],
        },
      ],
    };
    const htmlPt = generatePDFContent(withCost, null, undefined, "pt-BR");
    const htmlIt = generatePDFContent(withCost, null, undefined, "it-IT");
    expect(htmlPt).toContain("R$ 150,00");
    expect(htmlIt).toContain("R$ 150,00");
  });
});
