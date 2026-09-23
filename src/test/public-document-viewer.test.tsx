import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublicDocumentViewer } from "@/components/quote/PublicDocumentViewer";
import {
  canPreviewInline,
  resolveDocumentPreviewKind,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/publicDocumentViewer";

describe("visualizador de anexos do orçamento público", () => {
  it("classifica formatos corretamente", () => {
    expect(resolveDocumentPreviewKind("application/pdf", "voucher.pdf")).toBe("pdf");
    expect(resolveDocumentPreviewKind(null, "voucher.PDF")).toBe("pdf");
    expect(resolveDocumentPreviewKind("image/jpeg", "foto.jpg")).toBe("image");
    expect(resolveDocumentPreviewKind(null, "foto.webp")).toBe("image");
    expect(resolveDocumentPreviewKind("application/zip", "pacote.zip")).toBe("download");
    expect(canPreviewInline("application/zip", "pacote.zip")).toBe(false);
    expect(canPreviewInline("application/pdf", "a.pdf")).toBe(true);
  });

  it("usa endereço assinado de curta duração", () => {
    expect(SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(900);
    expect(SIGNED_URL_TTL_SECONDS).toBeGreaterThan(0);
  });

  it("exibe PDF autorizado dentro da página, sem navegar para o armazenamento", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const before = window.location.href;
    render(
      <PublicDocumentViewer
        doc={{ id: "1", file_name: "voucher.pdf", file_type: "application/pdf" }}
        signedUrl="https://storage.example/signed/voucher.pdf?token=abc"
        allowDownload
        onClose={() => {}}
        onDownload={() => {}}
      />,
    );
    expect(screen.getByTestId("public-document-viewer")).toBeTruthy();
    expect(screen.getByTestId("public-document-frame").getAttribute("src")).toContain("signed");
    expect(openSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
    openSpy.mockRestore();
  });

  it("exibe imagem em galeria", () => {
    render(
      <PublicDocumentViewer
        doc={{ id: "2", file_name: "hotel.jpg", file_type: "image/jpeg" }}
        signedUrl="https://storage.example/signed/hotel.jpg"
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("public-document-image")).toBeTruthy();
    expect(screen.queryByText("Baixar")).toBeNull();
  });

  it("mostra carregando enquanto o endereço não chegou e nada é renderizado sem anexo", () => {
    const { rerender } = render(
      <PublicDocumentViewer doc={{ id: "3", file_name: "a.pdf" }} signedUrl={null} loading onClose={() => {}} />,
    );
    expect(screen.getByText("Carregando anexo…")).toBeTruthy();
    rerender(<PublicDocumentViewer doc={null} signedUrl={null} onClose={() => {}} />);
    expect(screen.queryByTestId("public-document-viewer")).toBeNull();
  });

  it("fechar volta ao orçamento e baixar só aparece quando permitido", () => {
    const onClose = vi.fn();
    const onDownload = vi.fn();
    render(
      <PublicDocumentViewer
        doc={{ id: "4", file_name: "voucher.pdf", file_type: "application/pdf" }}
        signedUrl="https://storage.example/signed/x.pdf"
        allowDownload
        onClose={onClose}
        onDownload={onDownload}
      />,
    );
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Baixar"));
    expect(onDownload).toHaveBeenCalled();
  });
});
