import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { tWallet } from "@/i18n/publicMaterials/wallet";
const tw = tWallet("pt-BR");

const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");
const carousel = readFileSync("src/components/quote/ServiceImageCarousel.tsx", "utf8");
const docsCard = readFileSync("src/components/wallet/ServiceDocumentsCard.tsx", "utf8");
const wallet = readFileSync("src/pages/ViagemPublica.tsx", "utf8");

describe("Orientações do orçamento", () => {
  it("usa popovers acessíveis por etapa, sem o antigo modal geral", () => {
    expect(guide).toContain("PopoverTrigger");
    expect(guide).toContain("onMouseEnter");
    expect(guide).toContain("onFocus");
    expect(guide).not.toContain("Como montar seu orçamento");
    expect(guide).not.toContain("Ver mais");
  });
});

describe("Atribuição das fotos", () => {
  it("linha centralizada, largura total e com padding seguro", () => {
    expect(carousel).toContain("w-full min-w-0 px-3 py-1 text-center");
    expect(carousel).toContain("Fotos: Google Maps");
  });
});

describe("Documentos do serviço", () => {
  it("seção branca com borda neutra (sem fundo azul)", () => {
    expect(docsCard).toContain("rounded-2xl border border-border bg-background");
    expect(docsCard).not.toContain("bg-primary/5");
  });

  it("Abrir arquivo é ação primária sólida e download é secundário", () => {
    expect(docsCard).toContain("bg-primary px-4 text-[12px] font-semibold text-primary-foreground");
    expect(docsCard).toContain("border border-border bg-background text-muted-foreground");
  });

  it("nome longo quebra e ações se reorganizam no mobile", () => {
    expect(docsCard).toContain("break-words [overflow-wrap:anywhere]");
    expect(docsCard).toContain("flex w-full shrink-0 items-center gap-2 sm:w-auto");
  });
});

describe("Observações da hospedagem", () => {
  it("não entra mais na grade de detalhes de duas colunas", () => {
    expect(wallet).not.toContain("hotelDetails.push(`Obs: ${data.notes}`)");
  });

  it("bloco de largura total com título 'Observações:' e whitespace preservado", () => {
    expect(wallet).toContain("{isHotel && (data.notes || data.special_requests || data.agency_notes) && (");
    expect(wallet).toContain('>{t("secObservacoesColon")}<');
    expect(wallet).toContain("w-full min-w-0 text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-words");
    expect(wallet).toContain('{t("fldSolicitacoes")}: {data.special_requests}');
    expect(tw("secObservacoesColon")).toBe("Observações:");
    expect(tw("fldSolicitacoes")).toBe("Solicitações");
  });
});
