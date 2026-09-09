import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const page = read("src/pages/GerarOrcamento.tsx");
const form = read("src/components/quote/QuoteClientForm.tsx");
const destinations = read("src/components/quote/MultiDestinationInput.tsx");

describe("Gerar Orçamento — navegação e layout", () => {
  it("clique em Meus Orçamentos abre Meus Projetos (aba Orçamentos) em nova aba", () => {
    expect(page).toContain('openInternalWindow(nav.projects("orcamentos"))');
  });

  it("usa o helper de navegação contextual (plataforma/SiteLab/agências)", () => {
    expect(page).toContain("useAdminNav");
    expect(page).not.toMatch(/navigate\(["']\/meus-projetos\?tab=orcamentos["']\)/);
  });

  it("mantém Download + Importar como referência visual", () => {
    expect(page).toContain('<Download className="h-4 w-4" />');
    expect(page).toContain('className="shrink-0 h-9 rounded-lg"');
    expect(page).toContain("onClick={() => setImportOpen(true)}");
    expect(page).not.toContain("Já tem um orçamento pronto?");
  });

  it("primeira linha: Cliente 50%, Adultos 25%, Crianças 25%", () => {
    expect(form).toContain("md:grid-cols-4");
    expect(form).toContain("md:col-span-2");
    const cliente = form.indexOf("Cliente *");
    const adultos = form.indexOf("  Adultos\n");
    const criancas = form.indexOf("  Crianças\n");
    expect(cliente).toBeGreaterThan(-1);
    expect(cliente).toBeLessThan(adultos);
    expect(adultos).toBeLessThan(criancas);
  });

  it("segunda linha usa o layout em linha para Destinos + outra cidade + Adicionar", () => {
    expect(form).toContain('layout="row"');
    expect(destinations).toContain("md:grid-cols-4");
    expect(destinations).toContain("md:col-span-2");
  });

  it("remove apenas o exemplo (ex: Roma) do campo de outra cidade", () => {
    expect(destinations).not.toContain("(ex: Roma)");
    expect(destinations).toContain("+ Adicionar outra cidade");
    expect(destinations).toContain('placeholder="Ex: Paris, França"');
  });

  it("mantém a ordem Destinos → Tipo de Viagem → Período da Viagem", () => {
    const dest = form.indexOf("Destinos");
    const tipo = form.indexOf("Tipo de Viagem");
    const periodo = form.indexOf("Período da Viagem");
    expect(dest).toBeLessThan(tipo);
    expect(tipo).toBeLessThan(periodo);
  });

  it('renomeia "Configuração avançada" para "Outras Configurações"', () => {
    expect(form).toContain("Outras Configurações");
    expect(form).not.toContain("Configuração avançada");
  });

  it("não altera dados: sem novas escritas no banco nesses arquivos", () => {
    expect(destinations).not.toContain("supabase");
    expect(form).not.toContain(".insert(");
    expect(form).not.toContain(".delete(");
  });
});
