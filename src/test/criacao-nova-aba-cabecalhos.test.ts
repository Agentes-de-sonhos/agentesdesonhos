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
    const prompt = wallet.indexOf("Já tem um orçamento pronto?");
    const button = wallet.indexOf("<Download", prompt);
    const form = wallet.indexOf("<TripForm");
    expect(header).toBeLessThan(prompt);
    expect(prompt).toBeLessThan(button);
    expect(button).toBeLessThan(form);
  });

  it("usa o padrão Download + Importar e remove a redação antiga", () => {
    expect(wallet).not.toContain("ou aproveite informações já cadastradas");
    expect(wallet).not.toContain("Importar de um Orçamento");
    const prompt = wallet.indexOf("Já tem um orçamento pronto?");
    const block = wallet.slice(prompt, wallet.indexOf("</div>", wallet.indexOf("</Button>", prompt)) + 6);
    expect(block).toContain('<FileTextIcon className="h-4 w-4 text-primary" />');
    expect(block).toContain('<Download className="h-4 w-4" />');
    expect(block).toContain("Importar");
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
    expect(itinerary).not.toContain("Importe PDF, DOC ou texto.");
    expect(itinerary).not.toContain("Importar roteiro");
    expect(itinerary).toContain("md:flex-row md:items-start md:justify-between");
    expect(itinerary).toContain("md:whitespace-nowrap");
    const header = itinerary.indexOf("Novo Roteiro de Viagem");
    const prompt = itinerary.indexOf("Já tem um roteiro pronto?");
    const button = itinerary.indexOf("<Download", prompt);
    const form = itinerary.indexOf("<ItineraryForm", button);
    expect(header).toBeLessThan(prompt);
    expect(prompt).toBeLessThan(button);
    expect(button).toBeLessThan(form);
  });

  it("mantém o ícone de documento fora do botão e Download dentro dele", () => {
    const prompt = itinerary.indexOf("Já tem um roteiro pronto?");
    const block = itinerary.slice(itinerary.lastIndexOf("<div", prompt), itinerary.indexOf("</Button>", prompt));
    expect(block).toContain('<FileText className="h-4 w-4 text-primary" />');
    expect(block).toContain('<Download className="h-4 w-4" />');
    expect(block).toContain("Importar");
  });

  it("mantém o wizard de importação conectado", () => {
    expect(itinerary).toContain("setImportWizardOpen(true)");
    expect(itinerary).toContain("<ImportItineraryWizard");
  });
});

describe("Padrão visual dos três botões de importação", () => {
  it("usa Download, texto Importar e o mesmo estilo nos três cabeçalhos", () => {
    for (const source of [wallet, quote, itinerary]) {
      expect(source).toContain('<Download className="h-4 w-4" />');
      expect(source).toContain('variant="outline"');
      expect(source).toContain('size="sm"');
      expect(source).toContain('className="shrink-0 h-9 rounded-lg"');
    }
  });

  it("orçamento preserva o handler e não ganha frase externa", () => {
    expect(quote).toContain("onClick={() => setImportOpen(true)}");
    expect(quote).toContain("<QuoteImportDialog");
    expect(quote).not.toContain("Já tem um orçamento pronto?");
  });
});
