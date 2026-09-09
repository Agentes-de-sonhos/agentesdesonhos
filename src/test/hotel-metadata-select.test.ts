import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

const { fetchPlaceMetadata, extractPlaceDescription } = await import("@/lib/hotelMetadata");

const read = (p: string) => readFileSync(p, "utf8");

describe("metadados de hospedagem (modo econômico)", () => {
  beforeEach(() => invoke.mockReset());

  it("a seleção pede apenas metadados, nunca fotos", async () => {
    invoke.mockResolvedValue({ data: { place: { raw_data: { editorial_summary: "Hotel à beira-mar." } } }, error: null });
    const place = await fetchPlaceMetadata("PID1");
    expect(invoke).toHaveBeenCalledTimes(1);
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe("places-autocomplete");
    expect(opts.body).toMatchObject({ metadata_only: true, place_id: "PID1" });
    expect(opts.body.fetch_details).toBeUndefined();
    expect(extractPlaceDescription(place)).toBe("Hotel à beira-mar.");
  });

  it("falha e ausência de descrição são silenciosas", async () => {
    invoke.mockRejectedValue(new Error("boom"));
    expect(await fetchPlaceMetadata("PID1")).toBeNull();
    invoke.mockResolvedValue({ data: { place: { raw_data: {} } }, error: null });
    expect(extractPlaceDescription(await fetchPlaceMetadata("PID1"))).toBe("");
    expect(extractPlaceDescription(null)).toBe("");
  });

  it("lê editorial_summary do cache tanto como texto quanto como objeto", () => {
    expect(extractPlaceDescription({ raw_data: { editorial_summary: { overview: "Vista para o mar." } } })).toBe("Vista para o mar.");
  });

  it("metadata_only não solicita photos nem resolve URLs de imagem", () => {
    const fn = read("supabase/functions/places-autocomplete/index.ts");
    const block = fn.slice(fn.indexOf("Mode 0"), fn.indexOf("Mode 1"));
    expect(block).toContain("metadata_only");
    expect(block).toContain("editorial_summary");
    expect(block).not.toContain("resolveGooglePlacePhotoUrl");
    expect(block).not.toMatch(/metaFields = "[^"]*photos/);
    // Reutiliza o place_cache por place_id antes do Google.
    expect(block.indexOf("place_cache")).toBeLessThan(block.indexOf("maps.googleapis.com"));
  });

  it("HotelForm preenche descrição só se vazia e ignora resposta antiga", () => {
    const src = read("src/components/quote/ServiceForms.tsx");
    const block = src.slice(src.indexOf("const handleSelectPrediction"), src.indexOf("const handleSubmit"));
    expect(block).toContain("fetchPlaceMetadata");
    expect(block).toContain("metadataRequestRef.current !== p.place_id");
    expect(block).toContain('if (current) return;');
    expect(block).not.toContain("hotel-photos");
  });

  it("nenhuma busca automática de fotos: botão sob demanda e limite 5", () => {
    const picker = read("src/components/shared/GoogleHotelPhotos.tsx");
    expect(picker).toContain("!requested");
    expect(picker).toContain("Buscar fotos do Google");
    expect(picker).toMatch(/if \(!placeId \|\| !requested/);
    const forms = read("src/components/quote/ServiceForms.tsx");
    expect(forms).not.toContain("hotel-photos");
  });
});
