import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");
const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");
const settings = readFileSync("src/components/quote/QuoteSettingsModal.tsx", "utf8");
const summary = readFileSync("src/components/quote/QuoteSummary.tsx", "utf8");
const destination = readFileSync("src/components/quote/DestinationIntroEditor.tsx", "utf8");
const advancedSection = readFileSync("src/components/quote/AdvancedSettingsSection.tsx", "utf8");
const advanced = readFileSync("src/components/quote/QuoteAdvancedSettings.tsx", "utf8");
const documents = readFileSync("src/components/quote/QuoteDocuments.tsx", "utf8");

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

  it("mantém moeda e assinatura como accordions independentes, abertos inicialmente", () => {
    const advanced = page.match(/renderAdvanced=\{\(\) => \([\s\S]*?\n        \)\}/)?.[0] ?? "";
    expect(page).toContain("currency: true");
    expect(page).toContain("signature: true");
    expect(advanced).toContain("advancedSections.currency");
    expect(advanced).toContain('toggleAdvancedSection("currency")');
    expect(advanced).toContain("advancedSections.signature");
    expect(advanced).toContain('toggleAdvancedSection("signature")');
    expect(advanced).toContain("inlineSelector");
    expect(advanced).toContain("hideHeader");
    expect(advanced.indexOf("DocumentSignatureCard")).toBeLessThan(
      advanced.indexOf("QuoteBookingRequestSettings"),
    );
    expect(advanced).toContain("QuoteBookingRequestSettings");

    const currency = readFileSync("src/components/quote/QuoteAdvancedSettings.tsx", "utf8");
    expect(currency).toContain('data-testid="quote-currency-card"');
    expect(currency).toContain("Moeda do orçamento");
    expect(currency).toContain("AdvancedSettingsSection");

    const selector = readFileSync("src/components/signatures/SignatureSelector.tsx", "utf8");
    expect(selector).toContain('data-testid="signature-inline-grid"');
    expect(selector).toContain("grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3");
    expect(selector).toContain("Nova assinatura");
    expect(selector).toContain("Usar a assinatura padrão da agência");
    // popover preservado para os demais usos
    expect(selector).toContain("<Popover ");
    const inlineBranch = selector.slice(selector.indexOf("if (inline) {"), selector.indexOf("<Popover "));
    expect(inlineBranch).not.toContain("<Popover");
  });

  it("padroniza cabeçalhos avançados e faz o traço incluir ícone e título", () => {
    expect(advancedSection).toContain("min-h-[4.5rem]");
    expect(advancedSection).toContain("flex w-fit max-w-full flex-col");
    expect(advancedSection).toMatch(/icon[\s\S]*text-sm font-semibold[\s\S]*h-1 w-full/);
    expect(page).toContain('title="Escolha uma assinatura"');
    expect(page).toContain('<UserCircle2 className="h-4 w-4 text-rose-500" />');
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
    expect(page).toContain('data-testid="quote-main-data-card"');
    expect(summary).toContain("md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(19rem,1.3fr)]");
    expect(summary).toContain('data-testid="quote-main-data-grid"');
    expect(summary).not.toContain("Total Geral");
    expect(summary).not.toContain("serviço(s) incluído(s)");
    expect(summary).not.toContain("getEffectiveQuoteTotal");
  });

  it("organiza os dados principais em três colunas e duas linhas", () => {
    const client = summary.indexOf('data-testid="quote-main-client"');
    const destination = summary.indexOf('data-testid="quote-main-destination"');
    const period = summary.indexOf('data-testid="quote-main-period"');
    const title = summary.indexOf('data-testid="quote-main-title"');
    const passengers = summary.indexOf('data-testid="quote-main-passengers"');
    const reserved = summary.indexOf('data-testid="quote-main-reserved-cell"');

    expect(client).toBeGreaterThan(-1);
    expect(client).toBeLessThan(destination);
    expect(destination).toBeLessThan(period);
    expect(period).toBeLessThan(title);
    expect(title).toBeLessThan(passengers);
    expect(passengers).toBeLessThan(reserved);
    expect(summary).toContain('data-testid="quote-main-reserved-cell"');
    expect(summary).toContain('className="hidden min-h-14 border-l border-border/60 md:block"');
  });

  it("mantém passageiros à esquerda e período legível sem sobreposição", () => {
    const passengers = summary.match(/data-testid="quote-main-passengers"[\s\S]{0,240}/g) ?? [];
    expect(passengers).toHaveLength(2);
    passengers.forEach((cell) => {
      expect(cell).toContain("justify-start");
      expect(cell).toContain("text-left");
      expect(cell).toContain("md:border-l");
    });

    expect(summary).toContain('data-testid="quote-period-dates"');
    expect(summary).toContain("block whitespace-nowrap font-medium");
    expect(summary).toContain('data-testid="quote-period-days"');
    expect(summary).toContain("block text-center text-muted-foreground");
    expect(summary).toContain('title="Editar datas"');
    expect(summary).toMatch(/title="Editar datas"[\s\S]{0,100}<Pencil/);
    expect(summary).toContain('className="h-6 w-6 shrink-0"');
  });

  it("mantém o gatilho de validade compacto, responsivo e com calendário", () => {
    const validityBlock = page.match(/renderValidity=\{\(\) => \([\s\S]*?\n        \)\}/)?.[0] ?? "";
    expect(validityBlock).toContain("Válido até");
    expect(validityBlock).toContain('sm:w-[13rem]');
    expect(validityBlock).toContain("w-full");
    expect(validityBlock).toMatch(/w-full sm:w-\[13rem\]/);
    expect(validityBlock).not.toMatch(/<Button[^>]*className=\{cn\("w-full justify-start/);
    expect(validityBlock).toContain("CalendarIcon");
    expect(validityBlock).toContain("pointer-events-auto");
    expect(validityBlock).toContain('onSelect={setValidUntil}');
    expect(validityBlock).toContain("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4");
  });

  it("mantém a edição de passageiros em duas linhas atômicas", () => {
    expect(summary).toContain('data-testid="quote-adults-edit-row"');
    expect(summary).toContain('data-testid="quote-children-edit-row"');
    expect(summary.match(/items-center gap-2 whitespace-nowrap/g)).toHaveLength(2);
    expect(summary).toContain('htmlFor="quote-adults-count"');
    expect(summary).toContain('htmlFor="quote-children-count"');
    expect(summary).toContain('title="Salvar"');
  });

  it("remove o botão redundante e mantém a dropzone clicável, por teclado e por arraste", () => {
    expect(documents).not.toContain("Adicionar documento");
    expect(documents).toContain("Arraste arquivos aqui ou clique para selecionar");
    expect(documents).toContain('role="button"');
    expect(documents).toContain('tabIndex={0}');
    expect(documents).toContain("onDrop={handleDrop}");
    expect(documents).toContain("inputRef.current?.click()");
    expect(documents).toContain('event.key === "Enter" || event.key === " "');
    expect(documents).toContain("até 25MB por arquivo");
  });

  it("mantém os subtítulos internos simples e os dois cartões de capa equilibrados", () => {
    const initial = page.match(/renderInitial=\{\(\) => \([\s\S]*?\n        \)\}/)?.[0] ?? "";
    const dataHeading = initial.match(/<h4 id="quote-initial-data-title"[\s\S]*?<\/h4>/)?.[0] ?? "";
    expect(dataHeading).toContain("Dados principais");
    expect(dataHeading).not.toContain("<Users");
    expect(initial).not.toMatch(/quote-initial-data-title[\s\S]{0,220}bg-sky-500/);
    expect(initial).toMatch(/Configuração da capa[\s\S]{0,180}bg-sky-500/);

    expect(destination).toContain('data-testid="destination-cover-grid"');
    expect(destination).toContain("md:grid-cols-2");
    expect(destination).toContain('data-testid="destination-photos-card"');
    expect(destination).toContain('data-testid="destination-description-card"');

    const photosHeading = destination.match(/<h4 className="text-sm font-semibold text-foreground">[\s\S]*?Capa e fotos[\s\S]*?<\/h4>/)?.[0] ?? "";
    const descriptionHeading = destination.match(/<h4 className="text-sm font-semibold text-foreground">Descrição do destino<\/h4>/)?.[0] ?? "";
    expect(photosHeading).not.toContain("<Images");
    expect(descriptionHeading).not.toContain("<MapPin");
    expect(destination).not.toMatch(/Capa e fotos[\s\S]{0,300}h-1 w-full rounded-full bg-sky-500/);
    expect(destination).not.toMatch(/Descrição do destino[\s\S]{0,180}h-1 w-full rounded-full bg-sky-500/);
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
    expect(settings).not.toContain('active !== "advanced"');
    expect(settings).toContain("CurrentIcon");
    expect(advancedSection).toContain("accentClass");
    expect(advancedSection).toContain("h-1 w-full rounded-full");
    expect(page).toContain("QuoteBookingRequestSettings");
    expect(page).toContain("DocumentSignatureCard");
  });
});