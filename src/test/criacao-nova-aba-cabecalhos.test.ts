import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const wallet = read("src/pages/TripWallet.tsx");
const quote = read("src/pages/GerarOrcamento.tsx");
const itinerary = read("src/pages/CriarRoteiro.tsx");
const helper = read("src/lib/openInNewTab.ts");

describe("Nova aba para as listagens contextuais", () => {
  it("helper usa window.open com _blank e noopener,noreferrer", () => {
    expect(helper).toContain('window.open(path, "_blank", "noopener,noreferrer")');
  });

  it("Minhas Carteiras abre nav.projects('carteiras') em nova aba", () => {
    expect(wallet).toContain('openInNewTab(nav.projects("carteiras"))');
    expect(wallet).not.toContain('navigate(nav.projects("carteiras"))');
  });

  it("Meus Orçamentos abre nav.projects('orcamentos') em nova aba", () => {
    expect(quote).toContain('openInNewTab(nav.projects("orcamentos"))');
    expect(quote).not.toContain('navigate(nav.projects("orcamentos"))');
  });

  it("Meus Roteiros abre nav.projects('roteiros') em nova aba", () => {
    expect(itinerary).toContain('openInNewTab(nav.projects("roteiros"))');
    expect(itinerary).not.toContain('navigate(nav.projects("roteiros"))');
  });

  it("as três páginas importam o helper", () => {
    for (const f of [wallet, quote, itinerary]) {
      expect(f).toContain('from "@/lib/openInNewTab"');
    }
  });
});

describe("Carteira Digital — cabeçalho compacto", () => {
  it("botão de importar orçamento fica no CardHeader, antes do formulário", () => {
    const header = wallet.indexOf("Informações da Viagem");
    const button = wallet.indexOf("Importar de um Orçamento");
    const form = wallet.indexOf("<TripForm");
    expect(header).toBeLessThan(button);
    expect(button).toBeLessThan(form);
  });

  it("remove o bloco inferior antigo de importação", () => {
    expect(wallet).not.toContain("ou aproveite informações já cadastradas");
    expect(wallet.match(/Importar de um Orçamento/g)?.length).toBe(1);
  });

  it("mantém o mesmo modal conectado", () => {
    expect(wallet).toContain("setShowImportQuoteAsNew(true)");
    expect(wallet).toContain("<ImportQuoteAsNewWalletDialog");
  });
});

describe("Criar Roteiro — aba Modelos removida e cabeçalho compacto", () => {
  it("não exibe mais a aba Meus Modelos", () => {
    expect(itinerary).not.toContain("Meus Modelos");
    expect(itinerary).not.toContain('navigate(nav.projects("modelos"))');
  });

  it("cabeçalho compacta a importação ao lado do título", () => {
    expect(itinerary).toContain("Importe PDF, DOC ou texto.");
    expect(itinerary).toContain("sm:flex-row sm:items-center sm:justify-between");
    const header = itinerary.indexOf("Novo Roteiro de Viagem");
    const button = itinerary.indexOf("Importar roteiro");
    const form = itinerary.indexOf("<ItineraryForm", button);
    expect(header).toBeLessThan(button);
    expect(button).toBeLessThan(form);
  });

  it("mantém o wizard de importação conectado", () => {
    expect(itinerary).toContain("setImportWizardOpen(true)");
    expect(itinerary).toContain("<ImportItineraryWizard");
  });
});
