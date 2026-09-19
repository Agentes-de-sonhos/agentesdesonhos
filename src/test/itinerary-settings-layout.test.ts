import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const page = readFileSync("src/pages/CriarRoteiro.tsx", "utf8");
const modal = readFileSync("src/components/itinerary/ItinerarySettingsModal.tsx", "utf8");
const organizer = readFileSync("src/components/itinerary/ItineraryDaysOrganizer.tsx", "utf8");
const editor = readFileSync("src/components/itinerary/ItineraryEditor.tsx", "utf8");
const hook = readFileSync("src/hooks/useItineraries.ts", "utf8");

describe("configurações compactas do Roteiro", () => {
  it("abre um modal responsivo com as quatro etapas solicitadas", () => {
    expect(page).toContain('title="Configurar roteiro"');
    expect(page).toContain("<ItinerarySettingsModal");
    for (const step of ['key: "initial"', 'key: "days"', 'key: "pricing"', 'key: "advanced"']) expect(modal).toContain(step);
    expect(modal).toContain("w-[96vw] max-w-5xl");
    expect(modal).toContain("overflow-x-hidden overflow-y-auto");
  });

  it("mantém dados iniciais, período contínuo, capa, apresentação e passageiros separados", () => {
    for (const field of ["Destino", "Adultos", "Crianças", "Datas da viagem", "Frase de destaque do roteiro", "Capa e fotos", "Apresentação do destino"]) expect(page).toContain(field);
    expect(page).toContain("<TripPeriodField");
    expect(page).toContain("adjustItineraryDates.mutateAsync");
    expect(page).toContain("travelers_count: editAdults + editChildren");
    expect(hook).toContain("adultsCount: data.travelers_count as number");
    expect(hook).toContain("childrenCount: 0");
  });

  it("move somente a gestão dos dias e preserva a programação completa na página", () => {
    expect(page).toContain("showDayManagement={false}");
    expect(editor).toContain("showDayManagement = true");
    expect(editor).toContain("onUpdateActivity");
    for (const action of ["onReorder", "onAdd", "onDelete"]) expect(organizer).toContain(action);
    expect(organizer).toContain("useSortable({ id: day.id");
    expect(organizer).toContain("AddDayDialog");
    expect(organizer).toContain("DeleteDayDialog");
  });

  it("reutiliza valores, condições e assinatura sem alterar seus fluxos", () => {
    expect(page).toContain("<PricingSectionCard");
    expect(page).toContain("show_pricing_section");
    expect(page).toContain("pricing_content");
    expect(page).toContain('<DocumentSignatureCard table="itineraries"');
    expect(page).toContain("inlineSelector hideUseDefaultAction");
  });
});