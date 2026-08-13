import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { QuoteStepCard } from "@/components/quote/QuoteStepCard";
import { QuoteSettingsModal } from "@/components/quote/QuoteSettingsModal";

const destinationSource = readFileSync("src/components/quote/DestinationIntroEditor.tsx", "utf8");
const documentsSource = readFileSync("src/components/quote/QuoteDocuments.tsx", "utf8");
const pageSource = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

const renderModal = (extra: Record<string, unknown> = {}) =>
  render(
    <QuoteSettingsModal
      open
      onOpenChange={vi.fn()}
      renderDestination={() => <div>conteudo-destino</div>}
      renderIncluded={() => <div>conteudo-incluso</div>}
      renderPayment={() => <div>conteudo-investimento</div>}
      renderValidity={() => <div>conteudo-validade</div>}
      renderDocuments={() => <div>conteudo-documentos</div>}
      renderAdvanced={() => <div>conteudo-avancado</div>}
      {...extra}
    />,
  );

describe("QuoteStepCard — modo direto", () => {
  it("abre via clique e não renderiza o painel filho", () => {
    const onToggle = vi.fn();
    render(
      <QuoteStepCard
        step={3}
        id="etapa-3"
        title="Configurar apresentação"
        hint="Ajuste como o cliente verá o orçamento"
        accentClass="bg-primary"
        open={false}
        direct
        onToggle={onToggle}
      >
        <div>painel-filho</div>
      </QuoteStepCard>,
    );
    const trigger = screen.getByRole("button", { name: /Configurar apresentação/i });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBeNull();
    expect(screen.queryByText("painel-filho")).toBeNull();
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("mesmo com open=true o modo direto não expande o corpo", () => {
    render(
      <QuoteStepCard
        step={3} id="etapa-3" title="Configurar apresentação" hint="hint"
        accentClass="bg-primary" open direct onToggle={vi.fn()}
      >
        <div>painel-filho</div>
      </QuoteStepCard>,
    );
    expect(screen.queryByText("painel-filho")).toBeNull();
  });
});

describe("QuoteSettingsModal — título, passos e navegação", () => {
  it("usa o título consolidado e lista os seis passos", () => {
    renderModal();
    expect(screen.getByText("Configurações do Orçamento")).toBeTruthy();
    ["Destino", "Incluso", "Investimento", "Validade", "Documentos", "Avançado"].forEach((label) => {
      expect(screen.getByRole("button", { name: new RegExp(label) })).toBeTruthy();
    });
  });

  it("marca aria-current no passo atual e conclui/pendente conforme a posição", () => {
    renderModal();
    const destino = screen.getByRole("button", { name: /Destino/ });
    expect(destino.getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("button", { name: /Documentos/ }).getAttribute("aria-current")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Investimento/ }));
    expect(screen.getByRole("button", { name: /Investimento/ }).getAttribute("aria-current")).toBe("step");
    // passos anteriores ficam concluídos (check em vez de número)
    expect(screen.getByRole("button", { name: /Destino/ }).textContent).not.toContain("1");
    expect(screen.getByText("conteudo-investimento")).toBeTruthy();
  });

  it("navega por Voltar, Avançar e mostra Concluir no último passo", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /Voltar/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Avançar/ }));
    expect(screen.getByText("conteudo-incluso")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(screen.getByText("conteudo-destino")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Avançado/ }));
    expect(screen.getByRole("button", { name: "Concluir" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Avançar/ })).toBeNull();
  });

  it("o stepper tem overflow horizontal local", () => {
    renderModal();
    const nav = screen.getByRole("navigation", { name: /Passos das configurações/i });
    expect(nav.className).toContain("overflow-x-auto");
  });

  it("renderiza a ação de cabeçalho apenas no passo correspondente", () => {
    renderModal({ stepHeaderActions: { destination: <button type="button">switch-destino</button> } });
    expect(screen.getByRole("button", { name: "switch-destino" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Documentos/ }));
    expect(screen.queryByRole("button", { name: "switch-destino" })).toBeNull();
  });
});

describe("Passo 1 — destino", () => {
  it("o switch de visibilidade não é mais um card largo no corpo", () => {
    expect(destinationSource).not.toContain("show-destination-inline");
    expect(destinationSource).toContain("show-destination-header");
    expect(destinationSource).toContain("show_destination_intro");
    expect(pageSource).toContain("stepHeaderActions");
    expect(pageSource).toContain("DestinationIntroSwitch");
  });

  it("a descrição usa superfície branca e texto legível (text-sm), sem fundo cinza", () => {
    const surface = destinationSource.match(
      /data-testid="destination-description-surface"[\s\S]{0,220}/,
    )?.[0] as string;
    expect(surface).toBeTruthy();
    expect(surface).toContain("bg-background");
    expect(surface).not.toContain("bg-muted");
    expect(surface).toContain("text-sm");
    expect(surface).toContain("text-foreground");
  });

  it("mantém o lápis como ícone com aria-label e tooltip", () => {
    expect(destinationSource).toContain('aria-label="Editar descrição"');
    expect(destinationSource).toContain('title="Editar descrição"');
  });

  it("a ação de IA fica fora/abaixo do grid de duas colunas", () => {
    const gridStart = destinationSource.indexOf('className="grid gap-4 lg:grid-cols-2"');
    const aiAction = destinationSource.indexOf('data-testid="destination-ai-action"');
    const gridClose = destinationSource.indexOf("{/* Ação de IA");
    expect(gridStart).toBeGreaterThan(-1);
    expect(aiAction).toBeGreaterThan(gridClose);
    expect(gridClose).toBeGreaterThan(gridStart);
    expect(destinationSource).toContain("Regenerar descrição com IA");
  });

  it("o overlay reutiliza a primitiva compartilhada e oferece enviar/substituir, buscar e remover", () => {
    expect(destinationSource).toContain('from "@/components/shared/MediaOverlayActions"');
    expect(destinationSource).toContain("Enviar ou substituir a capa");
    expect(destinationSource).toContain("Buscar outra foto na internet");
    expect(destinationSource).toContain('label="Remover imagem"');
    expect(destinationSource).toContain('label="Definir como capa"');
    const itinerary = readFileSync("src/components/itinerary/ActivityMediaActions.tsx", "utf8");
    expect(itinerary).toContain('from "@/components/shared/MediaOverlayActions"');
    const primitive = readFileSync("src/components/shared/MediaOverlayActions.tsx", "utf8");
    expect(primitive).toContain("focus-visible:ring-ring");
    expect(primitive).toContain("group-focus-within:opacity-100");
    expect(primitive).toContain("opacity-100 transition-opacity sm:opacity-0");
  });
});

describe("Passo 5 — documentos", () => {
  it("usa a orientação exata solicitada", () => {
    const normalized = documentsSource.replace(/\s+/g, " ");
    expect(normalized).toContain(
      "Armazene aqui os arquivos originais utilizados para criar este orçamento, como propostas de fornecedores, cotações, PDFs e outros documentos. Assim, você mantém todo o material organizado e pode consultá-lo sempre que precisar.",
    );
    expect(normalized).toContain("não aparece para o cliente até que a agência ative a opção");
  });

  it("usa o label e a explicação exatos no item do arquivo", () => {
    const normalized = documentsSource.replace(/\s+/g, " ");
    expect(normalized).toContain("Disponibilizar este documento para o cliente");
    expect(normalized).toContain(
      "Ative somente se quiser que este arquivo apareça no orçamento enviado ao cliente. Desativado, ele permanece visível apenas para a agência.",
    );
  });

  it("novo upload persiste is_public: false explicitamente", () => {
    const insert = documentsSource.match(/\.insert\(\{[\s\S]*?\}\)/)?.[0] as string;
    expect(insert).toBeTruthy();
    expect(insert.replace(/\s+/g, " ")).toContain("is_public: false");
    expect(documentsSource).toContain("is_public");
  });

  it("mantém badges, visualizar, baixar, excluir e o campo is_public", () => {
    expect(documentsSource).toContain("Visível no público");
    expect(documentsSource).toContain("Somente interno");
    expect(documentsSource).toContain('title="Visualizar"');
    expect(documentsSource).toContain('title="Baixar"');
    expect(documentsSource).toContain('title="Excluir"');
    expect(documentsSource).toContain("togglePublicMutation");
  });
});

describe("Passo 6 — inventário real", () => {
  it("contém apenas moeda e solicitação de reserva, sem controles inventados", () => {
    const advanced = pageSource.match(/renderAdvanced=\{\(\) => \([\s\S]*?\n        \)\}/)?.[0] as string;
    expect(advanced).toBeTruthy();
    expect(advanced).toContain("QuoteAdvancedSettings");
    expect(advanced).toContain("QuoteBookingRequestSettings");
    expect(advanced).not.toMatch(/Identidade visual/i);
  });
});
