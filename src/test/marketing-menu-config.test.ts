import { describe, it, expect } from "vitest";
import { SECTION_ITEMS } from "@/config/menuConfig";

describe("Ferramentas de Marketing — hierarquia do menu", () => {
  it("mantém rótulos e ordem esperados", () => {
    expect(SECTION_ITEMS.marketing.map((i) => i.label)).toEqual([
      "Páginas de vendas personalizadas",
      "Formulário conversacional",
      "Cartão de visitas",
      "Outras",
      "Vitrine de ofertas",
      "Legendas, Stories e WhatsApp",
      "Personalizador de lâminas",
    ]);
  });

  it("preserva as chaves das ferramentas existentes", () => {
    const keys = SECTION_ITEMS.marketing.map((i) => i.key);
    for (const k of ["captacao_leads", "cartao_visitas", "vitrine_ofertas", "conteudo", "personalizador_laminas"]) {
      expect(keys).toContain(k);
    }
  });
});
