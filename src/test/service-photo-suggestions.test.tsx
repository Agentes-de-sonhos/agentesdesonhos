import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { GoogleHotelPhotos } from "@/components/shared/GoogleHotelPhotos";
import { makeGplaceRef } from "@/lib/serviceImages";
import { suggestServiceDescription } from "@/lib/serviceDescriptionSuggestion";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const photos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ url: `https://cdn/x${i}.jpg`, thumb_url: `https://cdn/t${i}.jpg` }));

beforeEach(() => {
  invoke.mockReset();
});

describe("galeria de fotos sugeridas", () => {
  it("mostra no máximo 5 miniaturas quando maxPhotos=5", async () => {
    invoke.mockResolvedValue({ data: { photos: photos(9) }, error: null });
    render(
      <GoogleHotelPhotos
        placeId="PL_LIMIT"
        onPhotosSelected={vi.fn()}
        existingUrls={[]}
        autoShow
        alwaysOpen
        maxPhotos={5}
      />,
    );
    await waitFor(() => expect(document.querySelectorAll("img").length).toBe(5));
  });

  it("pré-seleciona uma foto e não sobrescreve seleção do usuário", async () => {
    invoke.mockResolvedValue({ data: { photos: photos(4) }, error: null });
    const onPhotosSelected = vi.fn();
    render(
      <GoogleHotelPhotos
        placeId="PL_AUTO"
        onPhotosSelected={onPhotosSelected}
        existingUrls={[]}
        autoShow
        alwaysOpen
        maxPhotos={5}
        autoSelectFirst
      />,
    );
    await waitFor(() => expect(onPhotosSelected).toHaveBeenCalledWith([makeGplaceRef("PL_AUTO", 0)]));
    const calls = onPhotosSelected.mock.calls.length;
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(onPhotosSelected.mock.calls.length).toBe(calls);

    onPhotosSelected.mockClear();
    render(
      <GoogleHotelPhotos
        placeId="PL_AUTO2"
        onPhotosSelected={onPhotosSelected}
        existingUrls={["https://storage/minha.webp"]}
        autoShow
        alwaysOpen
        autoSelectFirst
      />,
    );
    await waitFor(() => expect(document.querySelectorAll("img").length).toBeGreaterThan(0));
    expect(onPhotosSelected).not.toHaveBeenCalled();
  });

  it("sem fotos disponíveis a galeria simplesmente não aparece", async () => {
    invoke.mockResolvedValue({ data: { photos: [] }, error: null });
    render(
      <GoogleHotelPhotos placeId="PL_EMPTY" onPhotosSelected={vi.fn()} existingUrls={[]} autoShow alwaysOpen autoSelectFirst />,
    );
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(screen.queryByText("Indisponível")).toBeNull();
    expect(document.querySelectorAll("img").length).toBe(0);
  });
});

describe("sugestão de descrição do serviço", () => {
  it("usa a descrição real do Places quando existir, sem chamar a IA", async () => {
    invoke.mockImplementation((fn: string) => {
      if (fn === "places-autocomplete")
        return Promise.resolve({ data: { place: { raw_data: { editorial_summary: { overview: "Parque temático em Orlando." } } } }, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const text = await suggestServiceDescription({ placeId: "P1", name: "Magic Kingdom", context: "Orlando" });
    expect(text).toContain("Parque temático");
    expect(invoke.mock.calls.some((c) => c[0] === "generate-destination-intro")).toBe(false);
  });

  it("cai para a IA existente quando o Places não traz descrição útil", async () => {
    invoke.mockImplementation((fn: string) => {
      if (fn === "places-autocomplete") return Promise.resolve({ data: { place: { raw_data: {} } }, error: null });
      if (fn === "generate-destination-intro")
        return Promise.resolve({ data: { text: "Experiência guiada pela cidade." }, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const text = await suggestServiceDescription({ placeId: "P2", name: "City Tour", context: "Orlando" });
    expect(text).toBe("Experiência guiada pela cidade.");
  });

  it("falha de rede não quebra o formulário", async () => {
    invoke.mockRejectedValue(new Error("offline"));
    await expect(suggestServiceDescription({ placeId: "P3", name: "Passeio" })).resolves.toBeFalsy();
  });
});
