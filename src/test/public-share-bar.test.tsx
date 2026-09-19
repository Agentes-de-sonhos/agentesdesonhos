import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { PublicShareBar } from "@/components/shared/PublicShareBar";

const copyTextToClipboard = vi.fn(async (_text: string) => true);
const success = vi.fn();

vi.mock("sonner", () => ({ toast: { success: (message: string) => success(message), error: vi.fn() } }));
vi.mock("@/lib/public-share-message", () => ({
  buildPublicShareMessage: ({ type, publicUrl, accessPassword }: { type: string; publicUrl: string; accessPassword?: string }) =>
    `${type}\n${publicUrl}${accessPassword ? `\nSenha: ${accessPassword}` : ""}`,
  copyTextToClipboard: (text: string) => copyTextToClipboard(text),
}));

const walletUrl = "https://agencia.tur.br/carteira/CODIGO";

beforeEach(() => vi.clearAllMocks());

describe("PublicShareBar", () => {
  it("mantém a ordem URL, copiar, abrir, mensagem e PDF e usa abertura segura", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const onGeneratePDF = vi.fn();
    render(
      <PublicShareBar
        type="wallet"
        publicUrl={walletUrl}
        message={{ clientFirstName: "Ana" }}
        onGeneratePDF={onGeneratePDF}
        pdfLabel="Gerar carteira digital PDF"
        description="Mensagem da carteira."
      />,
    );

    const url = screen.getByText(walletUrl);
    const copy = screen.getByRole("button", { name: "Copiar link da carteira digital" });
    const open = screen.getByRole("button", { name: "Abrir carteira digital em nova aba" });
    const message = screen.getByRole("button", { name: "Criar mensagem" });
    const pdf = screen.getByRole("button", { name: "Gerar carteira digital PDF" });
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(url.compareDocumentPosition(copy) & following).toBeTruthy();
    expect(copy.compareDocumentPosition(open) & following).toBeTruthy();
    expect(open.compareDocumentPosition(message) & following).toBeTruthy();
    expect(message.compareDocumentPosition(pdf) & following).toBeTruthy();
    fireEvent.click(open);
    expect(openSpy).toHaveBeenCalledWith(walletUrl, "_blank", "noopener,noreferrer");
    fireEvent.click(pdf);
    expect(onGeneratePDF).toHaveBeenCalledOnce();
    openSpy.mockRestore();
  });

  it("copia a URL exata e copia exatamente a mensagem editada", async () => {
    render(
      <PublicShareBar
        type="wallet"
        publicUrl={walletUrl}
        message={{ accessPassword: "segura" }}
        onGeneratePDF={vi.fn()}
        pdfLabel="Gerar carteira digital PDF"
        description="Mensagem da carteira."
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copiar link da carteira digital" }));
    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(walletUrl));
    expect(success).toHaveBeenCalledWith("Link copiado!");

    fireEvent.click(screen.getByRole("button", { name: "Criar mensagem" }));
    const textarea = await screen.findByLabelText("Mensagem") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Senha: segura");
    fireEvent.change(textarea, { target: { value: "Texto livre alterado" } });
    fireEvent.click(screen.getByRole("button", { name: "Copiar mensagem" }));
    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith("Texto livre alterado"));
  });

  it("não cria link e desabilita ações públicas quando a URL está ausente", () => {
    render(
      <PublicShareBar
        type="itinerary"
        publicUrl={null}
        message={{ destination: "Recife" }}
        onGeneratePDF={vi.fn()}
        pdfLabel="Gerar roteiro PDF"
        description="Mensagem do roteiro."
      />,
    );
    expect(screen.getByText("Link público indisponível")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar link do roteiro" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir roteiro em nova aba" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Criar mensagem" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gerar roteiro PDF" })).not.toBeDisabled();
  });

  it("liga Carteira e Roteiro aos handlers existentes sem os compartilhamentos antigos", () => {
    const wallet = readFileSync("src/pages/TripWallet.tsx", "utf8");
    const itinerary = readFileSync("src/pages/CriarRoteiro.tsx", "utf8");
    const quote = readFileSync("src/components/quote/QuoteShareBar.tsx", "utf8");
    expect(wallet).toContain("onGeneratePDF={handleGeneratePDF}");
    expect(wallet).toContain("accessPassword: trip.access_password");
    expect(wallet).not.toContain("<ShareTripModal");
    expect(itinerary).toContain('pdfLabel="Gerar roteiro PDF"');
    expect(itinerary).toContain('onGeneratePDF={() => handleActionClick("pdf")}');
    expect(itinerary).toContain("clientFirstName: currentItinerary.clientName");
    expect(itinerary).not.toContain("<PublicLinkActions");
    expect(itinerary).toContain("Salvar como modelo");
    expect(quote).toContain('type="quote"');
    expect(quote).toContain('pdfLabel="Gerar orçamento PDF"');
  });
});