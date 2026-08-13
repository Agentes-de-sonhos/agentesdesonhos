import { describe, it, expect } from "vitest";
import {
  googleDirectionsUrl,
  googlePlaceUrl,
  hasCoordinates,
  parseCoord,
  staticMapUrl,
  wazeDirectionsUrl,
} from "@/lib/mapLinks";

describe("mapLinks", () => {
  it("aceita coordenadas em texto com vírgula", () => {
    expect(parseCoord("-23,55")).toBe(-23.55);
    expect(parseCoord("abc")).toBeNull();
    expect(hasCoordinates({ latitude: "-23.55", longitude: "-46.63" })).toBe(true);
    expect(hasCoordinates({ latitude: null, longitude: -46.63 })).toBe(false);
  });

  it("gera rota por coordenadas quando disponíveis", () => {
    const url = googleDirectionsUrl({ latitude: -23.55, longitude: -46.63, placeId: "abc" })!;
    expect(url).toContain("destination=-23.55%2C-46.63");
    expect(url).toContain("destination_place_id=abc");
  });

  it("cai para endereço quando não há coordenadas", () => {
    const url = googleDirectionsUrl({ address: "Av. Atlântica 1702, Rio" })!;
    expect(url).toContain("Av.+Atl");
    expect(googleDirectionsUrl({})).toBeNull();
  });

  it("prioriza place_id na visualização", () => {
    expect(googlePlaceUrl({ placeId: "xyz", name: "Hotel" })).toContain("query_place_id=xyz");
  });

  it("gera rota do Waze", () => {
    expect(wazeDirectionsUrl({ latitude: -23.55, longitude: -46.63 })).toBe(
      "https://waze.com/ul?ll=-23.55%2C-46.63&navigate=yes",
    );
    expect(wazeDirectionsUrl({ name: "Hotel X" })).toContain("waze.com/ul?q=Hotel%20X");
  });

  it("monta o mapa estático pelo proxy próprio, sem chave", () => {
    const url = staticMapUrl({ latitude: -23.55, longitude: -46.63 }, "https://proj.supabase.co", {
      width: 5000,
      height: 200,
      zoom: 99,
    })!;
    expect(url.startsWith("https://proj.supabase.co/functions/v1/place-static-map?")).toBe(true);
    expect(url).toContain("w=1280");
    expect(url).toContain("zoom=20");
    expect(url).not.toContain("key=");
    expect(staticMapUrl({ address: "sem coord" }, "https://proj.supabase.co")).toBeNull();
  });
});