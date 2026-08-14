import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { getShortcutGridClass } from "@/pages/ViagemPublica";

const walletSource = readFileSync("src/pages/ViagemPublica.tsx", "utf8");

describe("Navegação rápida — grid responsivo", () => {
  it("retorna 1 coluna para um único atalho", () => {
    expect(getShortcutGridClass(1)).toBe("grid-cols-1");
  });

  it("retorna 2 colunas para 2 atalhos", () => {
    expect(getShortcutGridClass(2)).toBe("grid-cols-2");
  });

  it("retorna 3 colunas para 3 atalhos (preenche a largura)", () => {
    expect(getShortcutGridClass(3)).toBe("grid-cols-3");
  });

  it("retorna 2 colunas no mobile e 4 a partir de sm para 4 atalhos", () => {
    expect(getShortcutGridClass(4)).toBe("grid-cols-2 sm:grid-cols-4");
  });

  it("capa o desktop em 5 colunas para 5 ou mais atalhos", () => {
    expect(getShortcutGridClass(5)).toBe("grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5");
    expect(getShortcutGridClass(6)).toBe("grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5");
    expect(getShortcutGridClass(9)).toBe("grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5");
  });
});

describe("Navegação rápida — estrutura e classes em ViagemPublica.tsx", () => {
  it("usa o helper getShortcutGridClass no grid de atalhos", () => {
    expect(walletSource).toContain("getShortcutGridClass(shortcutCount)");
  });

  it("aplica auto-rows-fr e altura uniforme nos cards", () => {
    expect(walletSource).toContain("auto-rows-fr");
    expect(walletSource).toContain("h-full");
  });

  it("centraliza a navegação rápida em md+ no mesmo max-w-2xl do próximo serviço", () => {
    // The wrapper around the quick nav must be the same centered container used below.
    expect(walletSource).toContain(
      '{/* Navegação Rápida — full width on mobile, centered max-w-2xl on md+ */}\n                <div className="md:mx-auto md:w-full md:max-w-2xl">'
    );
    expect(walletSource).toContain(
      '{/* Coluna central (estreita em tablet/desktop) */}\n                <div className="flex flex-col gap-5 md:mx-auto md:w-full md:max-w-2xl">'
    );
  });

  it("mantém cliques, setActiveGroupType, abertura do roteiro e contadores", () => {
    expect(walletSource).toContain("onClick={() => setActiveGroupType(type)}");
    expect(walletSource).toContain("onClick={() => setItineraryOpen(true)}");
    expect(walletSource).toContain("{grouped[type].length}");
    expect(walletSource).toContain("dias");
  });
});
