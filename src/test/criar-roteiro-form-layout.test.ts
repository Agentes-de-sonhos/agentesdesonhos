import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const page = read("src/pages/CriarRoteiro.tsx");
const form = read("src/components/itinerary/ItineraryForm.tsx");
const hook = read("src/hooks/useItineraries.ts");

describe("Criar Roteiro — navegação e layout", () => {
  it("Meus Roteiros e Meus Modelos navegam para Meus Projetos via helper contextual", () => {
    expect(page).toContain('navigate(nav.projects("roteiros"))');
    expect(page).toContain('navigate(nav.projects("modelos"))');
    expect(page).toContain("useAdminNav");
  });

  it("bloco de importação fica no cabeçalho do card, antes do formulário", () => {
    const header = page.indexOf("Novo Roteiro de Viagem");
    const importBlock = page.indexOf("Já tem um roteiro pronto?");
    const formTag = page.indexOf("onSubmit={handleCreateItinerary}");
    expect(header).toBeLessThan(importBlock);
    expect(importBlock).toBeLessThan(formTag);
    expect(page).toContain("setImportWizardOpen(true)");
    expect(page).toContain("ImportItineraryWizard");
  });

  it("primeira linha: Cliente 50%, Adultos 25%, Crianças 25% com grupo Viajantes", () => {
    expect(form).toContain("md:grid-cols-4");
    expect(form).toContain("md:col-span-2");
    const cliente = form.indexOf("<Label>Cliente *</Label>");
    const viajantes = form.indexOf("              Viajantes");
    const origem = form.indexOf("Cidade de origem");
    const destino = form.indexOf("Destino principal");
    const periodo = form.indexOf("Período da Viagem");
    expect(cliente).toBeLessThan(viajantes);
    expect(viajantes).toBeLessThan(origem);
    expect(origem).toBeLessThan(destino);
    expect(destino).toBeLessThan(periodo);
  });

  it("Passageiros vem antes dos dois checkboxes, que ficam lado a lado no desktop", () => {
    const periodo = form.indexOf("Período da Viagem");
    const passageiros = form.indexOf("👥 Passageiros");
    const chegada = form.indexOf("Esta viagem possui informações de chegada e retorno");
    const multi = form.indexOf("Esta viagem possui múltiplos destinos");
    expect(periodo).toBeLessThan(passageiros);
    expect(passageiros).toBeLessThan(chegada);
    expect(chegada).toBeLessThan(multi);
    expect(form).toContain('grid grid-cols-1 md:grid-cols-2 gap-4 items-start');
  });

  it("renomeia o título de interesses", () => {
    expect(form).toContain("Interesses principais da viagem");
    expect(form).not.toContain("            Interesses da viagem");
  });

  it("remove os quatro campos de preferências adicionais, mantendo apenas o texto livre", () => {
    for (const t of ["Ritmo da viagem", "Restrições alimentares", "Preferência de experiências", "Tipo de locais"]) {
      expect(form).not.toContain(t);
    }
    expect(form).toContain("Mais alguma preferência?");
  });

  it("novas gerações não enviam valores padrão dos campos removidos", () => {
    expect(form).not.toContain("travelPace");
    expect(form).not.toContain("dietaryRestrictions");
    expect(form).not.toContain("localOrTouristy");
    expect(form).not.toContain("exclusiveOrPopular");
    expect(hook).toContain("travelPace: formData.travelPace,");
    expect(hook).not.toContain('formData.travelPace || "moderado"');
  });
});
