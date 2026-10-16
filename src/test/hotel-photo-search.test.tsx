import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HotelPhotoSearch } from "@/components/quote/HotelPhotoSearch";
import { GoogleHotelPhotos } from "@/components/shared/GoogleHotelPhotos";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

beforeEach(() => invoke.mockReset());

describe("busca explícita pelo nome de hospedagem", () => {
  it("resolve hotel seguro ao abrir sem seleção manual", async () => {
    const automatic = vi.fn();
    const manual = vi.fn();
    invoke.mockResolvedValue({ data: { predictions: [
      { place_id: "SAFE", name: "Portofino Bay", secondary: "Orlando, FL", is_hotel: true },
    ] }, error: null });
    render(<HotelPhotoSearch name="Portofino Bay" city="Orlando" autoResolve onAutoSelect={automatic} onSelect={manual} />);
    await waitFor(() => expect(automatic).toHaveBeenCalledTimes(1));
    expect(automatic.mock.calls[0][0].place_id).toBe("SAFE");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(manual).not.toHaveBeenCalled();
  });

  it.each([
    ["ambíguo", "Orlando", [
      { place_id: "A", name: "Portofino Bay", secondary: "Orlando", is_hotel: true },
      { place_id: "B", name: "Portofino Bay", secondary: "Orlando", is_hotel: true },
    ]],
    ["cidade conflitante", "Lisboa", [{ place_id: "A", name: "Portofino Bay", secondary: "Orlando", is_hotel: true }]],
    ["sem cidade", "", [{ place_id: "A", name: "Portofino Bay", secondary: "Orlando", is_hotel: true }]],
    ["não hotel", "Orlando", [{ place_id: "A", name: "Portofino Bay", secondary: "Orlando", is_hotel: false }]],
  ])("exige confirmação em resultado %s", async (_, city, predictions) => {
    const automatic = vi.fn();
    const manual = vi.fn();
    invoke.mockResolvedValue({ data: { predictions }, error: null });
    render(<HotelPhotoSearch name="Portofino Bay" city={city} autoResolve onAutoSelect={automatic} onSelect={manual} />);
    const choices = await screen.findAllByRole("button", { name: /Portofino Bay.*Orlando/ });
    expect(automatic).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledTimes(1);
    fireEvent.click(choices[0]);
    expect(manual).toHaveBeenCalledTimes(1);
  });

  it("não consulta ao abrir; envia nome e cidade apenas no clique e exige confirmação", async () => {
    const select = vi.fn();
    invoke.mockResolvedValue({ data: { predictions: [
      { place_id: "PID", name: "Portofino Bay", secondary: "Orlando" },
    ] }, error: null });
    render(<HotelPhotoSearch name="Portofino" city="Orlando" onSelect={select} />);
    expect(invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Buscar fotos/ }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenCalledWith("hotel-autocomplete", { body: { input: "Portofino", city: "Orlando" } });
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /Portofino Bay/ }));
    expect(select).toHaveBeenCalledWith({ place_id: "PID", name: "Portofino Bay", secondary: "Orlando" });
  });

  it("ignora resultado antigo depois de alterar o hotel", async () => {
    let resolve: (value: unknown) => void = () => {};
    invoke.mockReturnValue(new Promise((r) => { resolve = r; }));
    const select = vi.fn();
    const view = render(<HotelPhotoSearch name="Portofino" city="Orlando" onSelect={select} />);
    fireEvent.click(screen.getByRole("button", { name: /Buscar fotos/ }));
    view.rerender(<HotelPhotoSearch name="Pop Century" city="Orlando" onSelect={select} />);
    await act(async () => resolve({ data: { predictions: [{ place_id: "OLD", name: "Hotel antigo" }] }, error: null }));
    expect(screen.queryByRole("button", { name: /Hotel antigo/ })).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it("falha não seleciona hotel e permite tentar novamente", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("offline") });
    const select = vi.fn();
    render(<HotelPhotoSearch name="Portofino" city="Orlando" onSelect={select} />);
    fireEvent.click(screen.getByRole("button", { name: /Buscar fotos/ }));
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    expect(select).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Buscar fotos/ })).not.toBeDisabled();
  });

  it("a intenção explícita abre sugestões sem selecionar fotos automaticamente", async () => {
    invoke.mockResolvedValue({ data: { photos: [{ url: "https://cdn/photo", thumb_url: "https://cdn/thumb" }] }, error: null });
    const select = vi.fn();
    render(<GoogleHotelPhotos placeId="EXPLICIT_SEARCH" requestTrigger={1} onPhotosSelected={select} />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("hotel-photos", { body: { place_id: "EXPLICIT_SEARCH" } }));
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Selecionar foto 1" }));
    expect(select).toHaveBeenCalledTimes(1);
  });
});