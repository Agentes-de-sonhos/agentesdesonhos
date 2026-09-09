import { describe, it, expect, vi } from "vitest";
import {
  buildQueryText,
  collectPhotos,
  galleryCacheKey,
  isCacheFresh,
  MAX_PHOTOS,
  normalizePurpose,
  sourceOrder,
  type PhotoCandidate,
} from "../../supabase/functions/activity-photo/photoSearch";
import { photoSearchCacheKey, MAX_INTERNET_PHOTOS } from "@/components/shared/InternetPhotosPicker";

const photo = (id: string, source: string): PhotoCandidate => ({
  photo_url: `https://x/${id}`,
  thumb_url: `https://x/${id}-t`,
  source,
  attributions: [`Foto por ${source}`],
});

describe("busca de fotos — destino vs local específico", () => {
  it("destino usa Pexels → Unsplash → Google", () => {
    expect(sourceOrder("destination")).toEqual(["pexels", "unsplash", "google_places"]);
  });

  it("local específico mantém Google prioritário", () => {
    expect(sourceOrder("place")[0]).toBe("google_places");
    expect(normalizePurpose(undefined)).toBe("place");
  });

  it('"Campinas" em orçamento "Punta Cana" não recebe o contexto Punta Cana', () => {
    const q = buildQueryText("destination", { query: "Campinas", destination: "Punta Cana" });
    expect(q).toBe("Campinas");
    expect(q.toLowerCase()).not.toContain("punta");
    // Local específico continua contextualizado.
    expect(buildQueryText("place", { query: "Hotel Riu", destination: "Punta Cana" })).toBe("Hotel Riu Punta Cana");
  });

  it("Google só é chamado quando as fontes anteriores não preenchem", async () => {
    const google = vi.fn(async () => [photo("g1", "google_places")]);
    const pexels = vi.fn(async (n: number) => Array.from({ length: n }, (_, i) => photo(`p${i}`, "pexels")));
    const out = await collectPhotos(sourceOrder("destination"), { pexels, unsplash: async () => [], google_places: google }, 5);
    expect(out).toHaveLength(5);
    expect(out.every((p) => p.source === "pexels")).toBe(true);
    expect(google).not.toHaveBeenCalled();
  });

  it("fallback funciona quando uma fonte falha ou está vazia", async () => {
    const out = await collectPhotos(
      sourceOrder("destination"),
      {
        pexels: async () => { throw new Error("429"); },
        unsplash: async () => [],
        google_places: async () => [photo("g1", "google_places")],
      },
      3,
    );
    expect(out.map((p) => p.source)).toEqual(["google_places"]);
    expect(out[0].attributions?.length).toBe(1);
  });

  it("limite máximo é 5 fotos", async () => {
    const many = async (n: number) => Array.from({ length: 20 }, (_, i) => photo(`m${i}`, "pexels")).slice(0, 20);
    const out = await collectPhotos(sourceOrder("destination"), { pexels: many }, 18);
    expect(MAX_PHOTOS).toBe(5);
    expect(MAX_INTERNET_PHOTOS).toBe(5);
    expect(out).toHaveLength(5);
  });
});

describe("cache", () => {
  it("chave do servidor combina consulta normalizada + contexto", () => {
    expect(galleryCacheKey("destination", { query: "Campinas", destination: "Punta Cana" }))
      .toBe("gallery:destination:campinas");
    expect(galleryCacheKey("place", { query: "Hotel Riu", destination: "Punta Cana" }))
      .toBe("gallery:place:hotel riu punta cana|punta cana");
  });

  it("cache do servidor vale por 7 dias", () => {
    const now = Date.now();
    expect(isCacheFresh(new Date(now - 6 * 864e5).toISOString(), now)).toBe(true);
    expect(isCacheFresh(new Date(now - 8 * 864e5).toISOString(), now)).toBe(false);
    expect(isCacheFresh(null)).toBe(false);
  });

  it("chave do cliente nunca é só o texto e evita nova chamada", () => {
    const a = photoSearchCacheKey("Campinas", "destination", "Punta Cana");
    const b = photoSearchCacheKey("campinas", "destination", "Punta Cana");
    expect(a).toBe(b);
    expect(a).not.toBe("campinas");
    expect(photoSearchCacheKey("Hotel Riu", "place", "Punta Cana")).not.toBe(
      photoSearchCacheKey("Hotel Riu", "place", "Cancún"),
    );

    // Simula o cache em memória do picker: segunda busca não chama o servidor.
    const cache = new Map<string, PhotoCandidate[]>();
    const invoke = vi.fn(async () => [photo("p1", "pexels")]);
    const run = async (term: string) => {
      const key = photoSearchCacheKey(term, "destination");
      if (cache.has(key)) return cache.get(key)!;
      const list = await invoke();
      cache.set(key, list);
      return list;
    };
    return (async () => {
      await run("Campinas");
      await run("Campinas");
      expect(invoke).toHaveBeenCalledTimes(1);
    })();
  });
});

describe("gallery cache schema compatibility", () => {
  it("uses the existing created_at column (no updated_at) in the gallery flow", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      new URL("../../supabase/functions/activity-photo/index.ts", import.meta.url),
      "utf8",
    );
    const galleryBlock = src.slice(src.indexOf("wantMulti"), src.indexOf("// 1) cache lookup"));
    expect(galleryBlock).toContain('.select("photos, created_at")');
    expect(galleryBlock).toContain("isCacheFresh(cachedGallery.created_at)");
    expect(galleryBlock).toContain("created_at: new Date().toISOString()");
    expect(galleryBlock).not.toContain("updated_at");
  });
});
