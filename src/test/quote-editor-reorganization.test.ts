import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");
const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");
const settings = readFileSync("src/components/quote/QuoteSettingsModal.tsx", "utf8");

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
    expect(guide).toContain("flex-col gap-3 lg:flex-row");
    expect(guide).toContain("flex shrink-0 flex-wrap");
  });
});