import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");
const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");
const settings = readFileSync("src/components/quote/QuoteSettingsModal.tsx", "utf8");
const summary = readFileSync("src/components/quote/QuoteSummary.tsx", "utf8");
const destination = readFileSync("src/components/quote/DestinationIntroEditor.tsx", "utf8");
const advancedSection = readFileSync("src/components/quote/AdvancedSettingsSection.tsx", "utf8");

describe("Editor de orçamento reorganizado", () => {
  it("tem somente quatro passos explicativos na ordem aprovada", () => {
    const stepBlock = page.match(/const QUOTE_STEPS[\s\S]*?\n\];/)?.[0] ?? "";
    expect(stepBlock.match(/step:/g)).toHaveLength(4);
    expect(stepBlock).toMatch(/Adicionar serviços[\s\S]*Organizar serviços[\s\S]*Configurar orçamento[\s\S]*Publicar/);
    expect(stepBlock).not.toContain("Revisar orçamento");
    expect(stepBlock).not.toContain("Escolher assinatura");
    expect(guide).not.toContain("Ver mais");
    expect(guide).not.toContain("scrollIntoView");
  });

  it("mantém somente os três blocos principais", () => {
    expect(page.match(/<QuoteStepCard/g)).toHaveLength(3);
    expect(page).toContain('title="Adicionar serviços"');
    expect(page).toContain('title="Organizar serviços"');
    expect(page).toContain('title="Configurar orçamento"');
    expect(page).not.toContain('title="Revisar orçamento"');
    expect(page).not.toContain('title="Escolher assinatura"');
  });

  it("move revisão e capa para Configuração inicial sem duplicar", () => {
    expect(settings).toContain('key: "initial"');
    expect(settings).toContain('title: "Configuração inicial"');
    expect(page.match(/<QuoteSummary quote=\{quote\}/g)).toHaveLength(1);
    expect(page.match(/<DestinationIntroEditor/g)).toHaveLength(1);
    expect(page).toMatch(/Dados principais[\s\S]*QuoteSummary[\s\S]*Configuração da capa[\s\S]*DestinationIntroEditor/);
  });

  it("move a assinatura para Configurações avançadas sem duplicar", () => {
    expect(settings).toContain('title: "Configurações avançadas"');
    expect(page.match(/<DocumentSignatureCard/g)).toHaveLength(1);
    const advanced = page.match(/renderAdvanced=\{\(\) => \([\s\S]*?\n        \)\}/)?.[0] ?? "";
    expect(advanced).toContain("QuoteAdvancedSettings");
    expect(advanced).toContain("QuoteBookingRequestSettings");
    expect(advanced).toContain("DocumentSignatureCard");
  });

  it("preserva handlers de geração e layout responsivo das ações", () => {
    expect(page).toContain("onClick={handlePublish}");
    expect(page).toContain("onClick={handleGeneratePDF}");
    expect(page).toContain("disabled={isPublishing}");
    expect(page).toContain("actions={!quote.share_token ? (");
    expect(guide).toContain("flex-col gap-2 md:flex-row");
    expect(guide).toContain("flex shrink-0 items-center justify-end");
    expect(guide).toContain("grid-cols-2");
    expect(guide).toContain("sm:grid-cols-4");
  });

  it("compacta dados principais em duas linhas e remove o resumo financeiro", () => {
    expect(summary).toContain("md:grid-cols-6");
    expect(summary.match(/md:col-span-2/g)?.length).toBeGreaterThanOrEqual(3);
    expect(summary.match(/md:col-span-3/g)?.length).toBeGreaterThanOrEqual(2);
    expect(summary).not.toContain("Total Geral");
    expect(summary).not.toContain("serviço(s) incluído(s)");
    expect(summary).not.toContain("getEffectiveQuoteTotal");
  });

  it("mantém IA dentro da descrição e a chave no rodapé direito", () => {
    const descriptionStart = destination.indexOf("Descrição do destino");
    const descriptionEnd = destination.indexOf('data-testid="destination-description-surface"');
    const aiButton = destination.indexOf("Gerar com IA", descriptionStart);
    expect(aiButton).toBeGreaterThan(descriptionStart);
    expect(aiButton).toBeLessThan(descriptionEnd);
    expect(destination).toContain('data-testid="destination-visibility-action"');
    expect(destination).toContain("flex justify-end border-t");
    expect(destination).toContain("Exibir apresentação do destino");
  });

  it("aplica título com ícone e traço às seis etapas e seções avançadas", () => {
    expect(settings.match(/accentClass: "bg-/g)).toHaveLength(6);
    expect(settings).toContain('active !== "advanced"');
    expect(settings).toContain("CurrentIcon");
    expect(advancedSection).toContain("accentClass");
    expect(advancedSection).toContain("h-1 w-full rounded-full");
    expect(page).toContain('title="Moeda do orçamento"');
    expect(page).toContain("QuoteBookingRequestSettings");
    expect(page).toContain("DocumentSignatureCard");
  });
});