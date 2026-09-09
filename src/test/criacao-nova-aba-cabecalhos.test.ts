import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const wallet = read("src/pages/TripWallet.tsx");
const quote = read("src/pages/GerarOrcamento.tsx");
const itinerary = read("src/pages/CriarRoteiro.tsx");
const helper = read("src/workspace/useOpenInternalWindow.ts");

describe("Nova janela interna do sistema para as listagens contextuais", () => {
  it("helper usa as abas do workspace e nunca window.open", () => {
    expect(helper).toContain("workspace.openOrActivateTab");
    expect(helper).not.toContain("window.open");
  });

  it("Minhas Carteiras abre nav.projects('carteiras') em janela interna", () => {
    expect(wallet).toContain('openInternalWindow(nav.projects("carteiras"))');
    expect(wallet).not.toContain('navigate(nav.projects("carteiras"))');
  });

  it("Meus Orçamentos abre nav.projects('orcamentos') em janela interna", () => {
    expect(quote).toContain('openInternalWindow(nav.projects("orcamentos"))');
    expect(quote).not.toContain('navigate(nav.projects("orcamentos"))');
  });

  it("Meus Roteiros abre nav.projects('roteiros') em janela interna", () => {
    expect(itinerary).toContain('openInternalWindow(nav.projects("roteiros"))');
    expect(itinerary).not.toContain('navigate(nav.projects("roteiros"))');
  });

  it("as três páginas usam o hook de janela interna", () => {
    for (const f of [wallet, quote, itinerary]) {
      expect(f).toContain('from "@/workspace/useOpenInternalWindow"');
      expect(f).toContain("const openInternalWindow = useOpenInternalWindow();");
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
