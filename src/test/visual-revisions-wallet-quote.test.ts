import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");
const carousel = readFileSync("src/components/quote/ServiceImageCarousel.tsx", "utf8");
const docsCard = readFileSync("src/components/wallet/ServiceDocumentsCard.tsx", "utf8");
const wallet = readFileSync("src/pages/ViagemPublica.tsx", "utf8");

describe("Pop-up 'Como montar seu orçamento'", () => {
  it("é branco, largo e com rolagem apenas no corpo", () => {
    expect(guide).toContain("flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden bg-background p-0 md:max-w-3xl");
    expect(guide).toContain("min-h-0 flex-1 space-y-4 overflow-y-auto bg-background");
  });

  it("cabeçalho e rodapé brancos com divisórias sutis", () => {
    expect(guide).toContain("shrink-0 border-b border-border/60 bg-background");
    expect(guide).toContain("shrink-0 border-t border-border/60 bg-background");
  });

  it("cards internos são cinza-claro com borda sutil", () => {
    expect(guide).toContain("border border-border/70 bg-muted/40");
  });

  it("instrução final é parágrafo de fluxo normal", () => {
    expect(guide).toContain('<p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">');
    expect(guide).not.toContain("mt-3 flex items-center gap-1.5 text-[11px]");
    expect(guide).toContain("Essas ações estão nos botões");
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
    expect(wallet).toContain(">Observações:<");
    expect(wallet).toContain("w-full min-w-0 text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap break-words");
    expect(wallet).toContain("Solicitações: {data.special_requests}");
  });
});
