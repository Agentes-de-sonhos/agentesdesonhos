import { describe, expect, it } from "vitest";
import {
  CATEGORY_CONFIG,
  categoryText,
  resolveStatusBadge,
  formatFilesCountLabel,
  getServiceShortName,
} from "@/components/wallet/category/categoryPresentation";
import {
  formatFriendlyDate,
  formatFriendlyDateRange,
} from "@/lib/friendlyDateRange";
import type { TripService, TripServiceType } from "@/types/trip";

const TYPES: TripServiceType[] = [
  "flight",
  "hotel",
  "car_rental",
  "transfer",
  "attraction",
  "insurance",
  "cruise",
  "train",
  "other",
];

const svc = (type: TripServiceType, data: any): TripService =>
  ({ id: "x", service_type: type, service_data: data }) as any;

describe("categorias da carteira por idioma", () => {
  it("mantém os textos em português por padrão", () => {
    expect(categoryText("hotel").summaryTitle).toBe("Suas hospedagens");
    expect(categoryText("hotel").countWord(1)).toBe("1 hospedagem cadastrada");
    expect(categoryText("hotel").countWord(3)).toBe("3 hospedagens cadastradas");
    expect(categoryText("attraction").seeAllLabel).toBe("Ver todos os ingressos");
  });

  it("traduz título, contagem e link de todas as categorias", () => {
    for (const type of TYPES) {
      const pt = categoryText(type, "pt-BR");
      const it = categoryText(type, "it-IT");
      expect(it.summaryTitle).not.toBe(pt.summaryTitle);
      expect(it.seeAllLabel).not.toBe(pt.seeAllLabel);
      expect(it.countWord(1)).toMatch(/^1 \S/);
      expect(it.countWord(2)).not.toBe(it.countWord(1));
      expect(it.singular.length).toBeGreaterThan(2);
    }
  });

  it("traduz os rótulos de status sem inventar valores desconhecidos", () => {
    expect(resolveStatusBadge("confirmado")?.label).toBe("Confirmado");
    expect(resolveStatusBadge("confirmado", "it-IT")?.label).toBe("Confermato");
    expect(resolveStatusBadge("pendente", "it-IT")?.label).toBe("In attesa");
    expect(resolveStatusBadge("flexivel", "it-IT")?.label).toBe("Flessibile");
    // status livre digitado pela agência é preservado
    expect(resolveStatusBadge("Aguardando William", "it-IT")?.label).toBe("Aguardando William");
    expect(resolveStatusBadge("")).toBeNull();
  });

  it("traduz o contador de arquivos", () => {
    expect(formatFilesCountLabel(1)).toBe("1 arquivo");
    expect(formatFilesCountLabel(2)).toBe("2 arquivos");
    expect(formatFilesCountLabel(1, "it-IT")).toBe("1 file");
    expect(formatFilesCountLabel(0, "it-IT")).toBeNull();
  });
});

describe("cards compactos por idioma", () => {
  it("traduz o fallback do título e preserva o nome cadastrado", () => {
    expect(CATEGORY_CONFIG.hotel.getCompactFields(svc("hotel", {})).title).toBe("Hospedagem");
    expect(CATEGORY_CONFIG.hotel.getCompactFields(svc("hotel", {}), "it-IT").title).toBe("Alloggio");
    expect(
      CATEGORY_CONFIG.hotel.getCompactFields(svc("hotel", { hotel_name: "Hotel Ousare" }), "it-IT").title,
    ).toBe("Hotel Ousare");
    expect(CATEGORY_CONFIG.car_rental.getCompactFields(svc("car_rental", {}), "it-IT").title).toBe(
      "Autonoleggio",
    );
    expect(CATEGORY_CONFIG.other.getCompactFields(svc("other", {}), "it-IT").title).toBe("Servizio");
  });

  it("traduz período e horários do trecho aéreo", () => {
    const data = {
      departure_date: "2026-09-08",
      return_date: "2026-09-15",
      segments: [
        { flight_date: "2026-09-08", departure_time: "10:30", arrival_time: "22:45" },
      ],
    };
    const pt = CATEGORY_CONFIG.flight.getCompactFields(svc("flight", data)).details.join(" | ");
    const it = CATEGORY_CONFIG.flight.getCompactFields(svc("flight", data), "it-IT").details.join(" | ");
    expect(pt).toContain("Partida 10:30");
    expect(pt).toContain("Chegada 22:45");
    expect(it).toContain("Partenza 10:30");
    expect(it).toContain("Arrivo 22:45");
    expect(it).not.toContain("Partida");
  });

  it("usa nome curto traduzido no resumo", () => {
    expect(getServiceShortName(svc("train", {}), "it-IT")).toBe("Treno");
  });
});

describe("datas amigáveis por idioma", () => {
  it("preserva o formato pt-BR atual", () => {
    expect(formatFriendlyDate("2026-08-17")).toBe("17 de agosto de 2026");
    expect(formatFriendlyDateRange("2026-08-17", "2026-08-22")).toBe("17 a 22 de agosto de 2026");
    expect(formatFriendlyDateRange("2026-08-28", "2026-09-03")).toBe(
      "28 de agosto a 3 de setembro de 2026",
    );
  });

  it("formata em italiano quando solicitado", () => {
    expect(formatFriendlyDate("2026-08-17", "it-IT")).toBe("17 agosto 2026");
    expect(formatFriendlyDateRange("2026-08-17", "2026-08-22", "it-IT")).toBe(
      "dal 17 al 22 agosto 2026",
    );
    expect(formatFriendlyDateRange("2026-08-28", "2026-09-03", "it-IT")).toBe(
      "dal 28 agosto al 3 settembre 2026",
    );
    expect(formatFriendlyDateRange("2026-12-28", "2027-01-03", "it-IT")).toBe(
      "dal 28 dicembre 2026 al 3 gennaio 2027",
    );
  });

  it("mantém datas inválidas como nulas nos dois idiomas", () => {
    expect(formatFriendlyDate("2026-02-30", "it-IT")).toBeNull();
    expect(formatFriendlyDateRange(null, undefined, "it-IT")).toBeNull();
  });
});
