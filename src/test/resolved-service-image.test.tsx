import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ResolvedServiceThumb } from "@/components/shared/ResolvedServiceImage";
import { resolveServicePlaceId, makeGplaceRef } from "@/lib/serviceImages";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: any[]) => invoke(...args) } },
}));

beforeEach(() => {
  invoke.mockReset();
});

describe("resolveServicePlaceId", () => {
  it("prioriza a coluna de primeira classe e cai para service_data", () => {
    expect(resolveServicePlaceId({ place_id: "A", service_data: { place_id: "B" } })).toBe("A");
    expect(resolveServicePlaceId({ service_data: { place_id: "B" } })).toBe("B");
    expect(resolveServicePlaceId({ service_data: { google_place_id: "C" } })).toBe("C");
    expect(resolveServicePlaceId({})).toBeNull();
  });
});

describe("ResolvedServiceThumb", () => {
  it("nunca entrega gplace:// cru ao DOM e resolve pela API", async () => {
    invoke.mockResolvedValue({
      data: { photos: [{ url: "https://cdn.example/foto.jpg", thumb_url: "https://cdn.example/t.jpg" }] },
      error: null,
    });
    render(
      <ResolvedServiceThumb imageRef={makeGplaceRef("PLACE1", 0)} placeId="PLACE1" alt="Hotel" />,
    );
    await waitFor(() => {
      const img = screen.getByAltText("Hotel") as HTMLImageElement;
      expect(img.tagName).toBe("IMG");
      expect(img.getAttribute("src")).toBe("https://cdn.example/foto.jpg");
    });
    expect(document.body.innerHTML).not.toContain("gplace://");
  });

  it("mostra fallback (sem img quebrada) quando a referência não resolve", async () => {
    invoke.mockResolvedValue({ data: { photos: [] }, error: null });
    render(<ResolvedServiceThumb imageRef={makeGplaceRef("PLACE2", 3)} placeId="PLACE2" alt="Passeio" />);
    await waitFor(() => {
      expect(document.querySelector("img")).toBeNull();
    });
    expect(screen.getByRole("img", { name: "Passeio" })).toBeTruthy();
    expect(document.body.innerHTML).not.toContain("gplace://");
  });

  it("usa o fallback customizado informado", async () => {
    invoke.mockResolvedValue({ data: { photos: [] }, error: null });
    render(
      <ResolvedServiceThumb
        imageRef={makeGplaceRef("P3", 0)}
        placeId="P3"
        alt="Transfer"
        fallback={<div data-testid="custom-fallback" />}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("custom-fallback")).toBeTruthy());
    expect(document.querySelector("img")).toBeNull();
  });

  it("mantém URLs estáveis do Storage sem chamar a API do Google", async () => {
    render(<ResolvedServiceThumb imageRef="https://storage.example/a.jpg" alt="Foto 1" />);
    const img = screen.getByAltText("Foto 1") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://storage.example/a.jpg");
    expect(invoke).not.toHaveBeenCalled();
  });
});
