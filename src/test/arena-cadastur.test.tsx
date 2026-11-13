import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CadasturSeal, cadasturCertificateFor } from "@/components/whitelabel/CadasturSeal";

afterEach(cleanup);
describe("certificado Cadastur Arena", () => {
  it("abre o documento da Arena na prévia e fecha com Escape", () => {
    render(<CadasturSeal hostname="briefing-23-v1.preview.local" className="h-7" />);
    const button = screen.getByRole("button", { name: "Ver certificado Cadastur" });
    expect(button).toHaveAttribute("data-preview-local", "true");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Arena Travel Group, uma Agência de Viagens licenciada pelo Ministério do Turismo");
    expect(screen.getByRole("tooltip")).not.toHaveTextContent("18/09/2024");
    fireEvent.click(button);
    expect(screen.getByRole("img", { name: "Certificado Cadastur da Arena Travel Group" })).toHaveAttribute("src", "/arena-travel-group/certificado-cadastur-2026-2028.webp");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("preserva o certificado de outras agências e não libera host desconhecido", () => {
    expect(cadasturCertificateFor("briefing-23-v1.preview.local")?.agency).toBe("Arena Travel Group");
    expect(cadasturCertificateFor("curtiviagens.com.br")?.agency).toBe("Curti Viagens");
    expect(cadasturCertificateFor("briefing-23-v1.preview.local.example.com")).toBeNull();
  });
});
