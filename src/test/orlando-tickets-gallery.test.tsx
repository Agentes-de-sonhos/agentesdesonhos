import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OrlandoTicketsSection } from "@/components/orlando/OrlandoTicketsSection";
import { OrlandoEditorialGallery } from "@/components/orlando/OrlandoEditorialGallery";

const { submit } = vi.hoisted(() => ({ submit: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("@/hooks/useAgencySiteRequest", () => ({
  useAgencySiteRequest: () => ({ submit, state: "idle", error: null }),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Galeria editorial da página de ingressos", () => {
  it("mostra nove fotos na ordem aprovada e não tem controles", () => {
    render(<OrlandoEditorialGallery hostname="destinoscomaju.com.br" />);
    const gallery = screen.getByRole("region", { name: "Parques e experiências em Orlando" });
    expect(within(gallery).getAllByRole("heading", { level: 3 }).map((node) => node.textContent)).toEqual([
      "Walt Disney World Resort", "Universal Orlando Resort", "United Parks & Resorts",
      "LEGOLAND Florida Resort", "Kennedy Space Center", "ICON Park",
      "Cirque du Soleil — Drawn to Life", "Blue Man Group Orlando", "Orlando Magic",
    ]);
    const photos = within(gallery).getAllByRole("img");
    expect(photos).toHaveLength(9);
    for (const photo of photos) {
      expect(photo.getAttribute("loading")).toBe("lazy");
      expect(photo.getAttribute("src")).toMatch(/^\/__l5e\/assets-v1\//);
      expect(photo.getAttribute("alt")?.length).toBeGreaterThan(20);
    }
    expect(within(gallery).queryByRole("button")).toBeNull();
    expect(within(gallery).queryByRole("link")).toBeNull();
  });

  it("aceita www mas não outros tenants", () => {
    const { rerender } = render(<OrlandoEditorialGallery hostname="www.destinoscomaju.com.br" />);
    expect(screen.getAllByRole("img")).toHaveLength(9);
    for (const hostname of ["100limites.tur.br", "paraisoviagens.com", "casanovatur.demo.local", "localhost"]) {
      rerender(<OrlandoEditorialGallery hostname={hostname} />);
      expect(screen.queryByRole("region")).toBeNull();
    }
  });

  it("preserva validação, seleção, navegação e payload das quatro etapas", async () => {
    render(<OrlandoTicketsSection hostname="destinoscomaju.com.br" mode="page" />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar", exact: true }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe as datas de chegada e saída.");
    fireEvent.click(screen.getByRole("button", { name: "Ainda não sei", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar", exact: true }));
    expect(screen.getByText("Etapa 2 de 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Magic Kingdom/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar", exact: true }));
    expect(screen.getByText("Etapa 3 de 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar", exact: true }));
    expect(screen.getByText("Etapa 4 de 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar meu orçamento de ingressos" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe seu nome.");
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Teste Galeria" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "11999999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar meu orçamento de ingressos" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Autorize o contato para enviar.");
    fireEvent.click(screen.getByRole("checkbox", { name: /Autorizo a agência/ }));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar meu orçamento de ingressos" }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      service_key: "ingressos", consent: true,
      details: expect.objectContaining({ experiencias_ids: "magic-kingdom", adultos: "2" }),
    }));
  });
});