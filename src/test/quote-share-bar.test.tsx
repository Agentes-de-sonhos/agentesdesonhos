import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { QuoteShareBar } from "@/components/quote/QuoteShareBar";

const copyTextToClipboard = vi.fn(async (_text: string) => true);
const success = vi.fn();

vi.mock("sonner", () => ({ toast: { success: (m: string) => success(m), error: vi.fn() } }));
vi.mock("@/lib/public-share-message", () => ({
  buildPublicShareMessage: (_input?: unknown) => "Olá Catia! Segue o orçamento.\nhttps://seuorcamento.tur.br/nobre/abc",
  copyTextToClipboard: (t: string) => copyTextToClipboard(t),
}));

const publicUrl = "https://seuorcamento.tur.br/nobre-tours/rQk7E8N9";
const onGeneratePDF = vi.fn();

const bar = (clientFirstName = "Catia") => (
  <QuoteShareBar
    publicUrl={publicUrl}
    onGeneratePDF={onGeneratePDF}
    message={{ clientFirstName }}
  />
);

const renderBar = () => render(bar());

beforeEach(() => vi.clearAllMocks());

describe("QuoteShareBar — estado com URL pública", () => {
  it("mostra Criar mensagem, URL completa, copiar por ícone e PDF, sem Compartilhar/Abrir/Copiar link", () => {
    renderBar();
    expect(screen.getByRole("button", { name: "Criar mensagem" })).toBeTruthy();
    expect(screen.getByText(publicUrl)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar link do orçamento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gerar orçamento PDF/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Compartilhar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Abrir$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Copiar link$/i })).toBeNull();
  });

  it("copia o link e exibe o toast 'Link copiado!'", async () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Copiar link do orçamento" }));
    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(publicUrl));
    expect(success).toHaveBeenCalledWith("Link copiado!");
  });

  it("aciona a ação de PDF existente", () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /Gerar orçamento PDF/i }));
    expect(onGeneratePDF).toHaveBeenCalledTimes(1);
  });

  it("URL em uma única linha com truncate e sem regras de quebra", () => {
    renderBar();
    const url = screen.getByText(publicUrl);
    expect(url.className).toContain("truncate");
    expect(url.className).toContain("whitespace-nowrap");
    expect(url.className).toContain("min-w-0");
    expect(url.className).not.toContain("break-all");
    expect(url.className).not.toContain("anywhere");
    expect(url.getAttribute("title")).toBe(publicUrl);
  });

  it("campo da URL tem fundo branco, min-w-0 e contém o botão de copiar (sem botão externo)", () => {
    renderBar();
    const url = screen.getByText(publicUrl);
    const field = url.parentElement!;
    expect(field.className).toContain("bg-background");
    expect(field.className).not.toContain("bg-muted");
    expect(field.className).toContain("min-w-0");
    expect(field.className).toContain("overflow-hidden");
    const copyBtn = screen.getByRole("button", { name: "Copiar link do orçamento" });
    expect(field.contains(copyBtn)).toBe(true);
    expect(copyBtn.className).toContain("border-l");
    expect(field.parentElement?.className).toContain("flex-wrap");
  });

  it("Gerar orçamento PDF usa estilo primário azul (não outline)", () => {
    renderBar();
    const pdf = screen.getByRole("button", { name: /Gerar orçamento PDF/i });
    expect(pdf.className).toContain("bg-primary");
    expect(pdf.className).not.toContain("border-input");
  });
});

describe("QuoteShareBar — modal Criar mensagem", () => {
  it("abre o modal com textarea editável e copia a mensagem editada", async () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Criar mensagem" }));

    expect(await screen.findByText("Mensagem pronta para envio")).toBeTruthy();
    expect(
      screen.getByText(/Preparamos uma mensagem com os principais dados deste orçamento/),
    ).toBeTruthy();
    expect(copyTextToClipboard).not.toHaveBeenCalled();

    const textarea = screen.getByLabelText("Mensagem") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Olá Catia");

    fireEvent.change(textarea, { target: { value: "Mensagem ajustada pela agência" } });
    fireEvent.click(screen.getByRole("button", { name: /Copiar mensagem/i }));

    await waitFor(() =>
      expect(copyTextToClipboard).toHaveBeenCalledWith("Mensagem ajustada pela agência"),
    );
    expect(success).toHaveBeenCalledWith("Mensagem copiada!");
    // Não fecha automaticamente após copiar.
    expect(screen.getByText("Mensagem pronta para envio")).toBeTruthy();
  });

  it("preserva as edições em rerenders do pai e reinicializa ao reabrir", async () => {
    const view = render(bar());
    fireEvent.click(screen.getByRole("button", { name: "Criar mensagem" }));
    await screen.findByText("Mensagem pronta para envio");

    const textarea = screen.getByLabelText("Mensagem") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Texto editado pela agência" } });

    // Rerender do pai com um NOVO objeto `message` (ex.: autosave alterando o estado).
    view.rerender(bar("Catia Lima"));
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe(
      "Texto editado pela agência",
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByText("Mensagem pronta para envio")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Criar mensagem" }));
    await screen.findByText("Mensagem pronta para envio");
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toContain(
      "Olá Catia",
    );
  });

  it("fecha o modal no botão Fechar", async () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Criar mensagem" }));
    await screen.findByText("Mensagem pronta para envio");
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByText("Mensagem pronta para envio")).toBeNull());
  });
});

describe("Cabeçalho e bloco de orientações do orçamento", () => {
  const page = readFileSync("src/pages/GerarOrcamento.tsx", "utf8");
  const guide = readFileSync("src/components/quote/QuoteStepsGuide.tsx", "utf8");

  it("mostra os dois botões de geração apenas enquanto não há URL pública", () => {
    expect(page).toContain("{!quote.share_token && (");
    expect(page).not.toContain("PublicLinkActions");
    // A barra de compartilhamento só existe com share_token.
    const barIndex = page.indexOf("<QuoteShareBar");
    expect(page.slice(0, barIndex)).toContain("{quote.share_token && (");
  });

  it("cabeçalho em duas linhas: ações abaixo do título e alinhadas à esquerda", () => {
    const barIndex = page.indexOf("<QuoteShareBar");
    expect(page.slice(barIndex, barIndex + 400)).toContain('className="justify-start sm:pl-[52px]"');
    expect(page).toContain('<div className="flex w-full min-w-0 flex-col gap-3">');
    expect(page).not.toContain('className="lg:justify-end"');
  });

  it("no estado sem URL, o botão PDF também usa estilo primário", () => {
    const preIndex = page.indexOf("{!quote.share_token && (");
    const block = page.slice(preIndex, preIndex + 1200);
    expect(block).toContain("Gerar orçamento PDF");
    expect(block).not.toContain('variant="outline"');
  });

  it("bloco 'Depois das 5 etapas' com fundo branco e apenas borda azul", () => {
    expect(guide).toContain("border border-primary/30 bg-background");
    expect(guide).not.toContain("bg-primary/5");
    expect(guide).toContain("Depois das 5 etapas: publique e compartilhe");
  });
});
