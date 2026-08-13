import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ServiceDocumentsCard } from "@/components/wallet/ServiceDocumentsCard";

const download = vi.fn(async () => {});
const openDocument = vi.fn(async () => {});

vi.mock("@/hooks/useSecureDocument", () => ({
  useSecureDocument: () => ({
    doc: null,
    open: true,
    loading: true,
    downloading: false,
    error: null,
    openDocument,
    retry: vi.fn(),
    close: vi.fn(),
    download,
  }),
}));

const service = {
  documents: [
    { url: "user-1/a/voucher.pdf", name: "voucher.pdf" },
    { url: "user-1/b/voucher.pdf", name: "voucher.pdf" },
  ],
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("ServiceDocumentsCard — documento selecionado", () => {
  it("usa o documento clicado (mesmo com nomes duplicados) antes de carregar", async () => {
    render(
      <ServiceDocumentsCard
        service={service}
        access={{ mode: "public", shareToken: "a".repeat(32) }}
      />,
    );

    const openButtons = screen.getAllByRole("button", { name: /Abrir arquivo voucher\.pdf/ });
    expect(openButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(openButtons[1]);

    expect(openDocument).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: "user-1/b/voucher.pdf", fileName: "voucher.pdf" }),
    );

    // Baixar dentro do modal usa exatamente o segundo documento, mesmo sem doc carregado
    const modalDownload = screen
      .getAllByRole("button", { name: /Baixar arquivo voucher\.pdf/ })
      .slice(-1)[0];
    fireEvent.click(modalDownload);
    await waitFor(() =>
      expect(download).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: "user-1/b/voucher.pdf" }),
      ),
    );
  });

  it("propaga slug/senha do acesso legado para a fonte segura", () => {
    render(
      <ServiceDocumentsCard
        service={{ voucher_url: "user-1/x/reserva.pdf", voucher_name: "reserva.pdf" }}
        access={{ mode: "public", slug: "minha-agencia", password: "1234" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Abrir arquivo reserva\.pdf/ }));
    expect(openDocument).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "minha-agencia", password: "1234", shareToken: undefined }),
    );
  });
});