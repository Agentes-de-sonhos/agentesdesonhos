import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  collectServiceImageRefs,
  collectServiceImages,
  buildServiceImageResolver,
  waitForWindowImages,
} from "@/components/trip/TripPDF";
import { makeGplaceRef } from "@/lib/serviceImages";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: any[]) => invoke(...args) } },
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn() } }));

const svc = (over: any) => ({ service_type: "hotel", ...over }) as any;

beforeEach(() => invoke.mockReset());

describe("TripPDF image refs", () => {
  it("dedupa referências preservando ordem", () => {
    const s = svc({ image_urls: ["a", "b", "a"], image_url: "b" });
    expect(collectServiceImageRefs(s)).toEqual(["a", "b"]);
  });
});

describe("TripPDF resolver", () => {
  it("resolve gplace:// e nunca deixa a referência crua", async () => {
    invoke.mockResolvedValue({
      data: { photos: [{ url: "https://cdn.example/fresh.jpg", thumb_url: "t" }] },
      error: null,
    });
    const s = svc({ image_urls: [makeGplaceRef("P1", 0)], place_id: "P1" });
    const resolve = await buildServiceImageResolver([s]);
    const urls = collectServiceImages(s, resolve);
    expect(urls).toEqual(["https://cdn.example/fresh.jpg"]);
    expect(urls.join()).not.toContain("gplace://");
  });

  it("URL legada do Google com place_id usa a URL fresca", async () => {
    invoke.mockResolvedValue({
      data: { photos: [{ url: "https://cdn.example/new.jpg", thumb_url: "t" }] },
      error: null,
    });
    const legacy = "https://lh3.googleusercontent.com/place-photos/AAA";
    const s = svc({ image_urls: [legacy], service_data: { place_id: "P2" } });
    const resolve = await buildServiceImageResolver([s]);
    expect(collectServiceImages(s, resolve)).toEqual(["https://cdn.example/new.jpg"]);
  });

  it("omite imagem Google não resolvida", async () => {
    invoke.mockResolvedValue({ data: { photos: [] }, error: null });
    const s = svc({ image_urls: [makeGplaceRef("P3", 2), "https://storage.example/ok.jpg"], place_id: "P3" });
    const resolve = await buildServiceImageResolver([s]);
    expect(collectServiceImages(s, resolve)).toEqual(["https://storage.example/ok.jpg"]);
  });

  it("preserva URL estável do Storage sem chamar o Google", async () => {
    const s = svc({ image_urls: ["https://storage.example/a.jpg"] });
    const resolve = await buildServiceImageResolver([s]);
    expect(collectServiceImages(s, resolve)).toEqual(["https://storage.example/a.jpg"]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("referências duplicadas não geram fotos repetidas", async () => {
    invoke.mockResolvedValue({
      data: { photos: [{ url: "https://cdn.example/same.jpg", thumb_url: "t" }] },
      error: null,
    });
    const ref = makeGplaceRef("P4", 0);
    const s = svc({ image_urls: [ref, ref], image_url: ref, place_id: "P4" });
    const resolve = await buildServiceImageResolver([s]);
    expect(collectServiceImages(s, resolve)).toEqual(["https://cdn.example/same.jpg"]);
  });
});

describe("waitForWindowImages", () => {
  it("aguarda load/error de todas as imagens pendentes", async () => {
    const listeners: Record<string, () => void>[] = [];
    const mk = (complete: boolean) => {
      const map: Record<string, () => void> = {};
      listeners.push(map);
      return { complete, addEventListener: (ev: string, cb: () => void) => { map[ev] = cb; } };
    };
    const win = { document: { images: [mk(false), mk(false), mk(true)] } } as any;
    let resolved = false;
    const p = waitForWindowImages(win, 5000).then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    listeners[0].load();
    await Promise.resolve();
    expect(resolved).toBe(false);
    listeners[1].error();
    await p;
    expect(resolved).toBe(true);
  });

  it("resolve por timeout quando imagem nunca termina", async () => {
    vi.useFakeTimers();
    const win = { document: { images: [{ complete: false, addEventListener: () => {} }] } } as any;
    let resolved = false;
    const p = waitForWindowImages(win, 1000).then(() => { resolved = true; });
    vi.advanceTimersByTime(1000);
    await p;
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});
