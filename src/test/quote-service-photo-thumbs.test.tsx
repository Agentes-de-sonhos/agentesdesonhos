import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import { ResolvedThumb, photoKeys } from "@/components/quote/ServiceForms";
import { makeGplaceRef } from "@/lib/serviceImages";

const invoke = vi.fn();
vi.mock("@/lib/pdfText", () => ({ extractPdfText: vi.fn(async () => "") }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => invoke(...args) },
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));

beforeEach(() => {
  invoke.mockReset();
});

const UPLOADED = "https://storage.example/object/public/quote-images/user/quotes/a.webp";

/** Simula o formulário: cada "digitação" provoca um novo render do pai. */
function TypingHost({ imageRef, placeId }: { imageRef: string; placeId?: string }) {
  const [text, setText] = useState("");
  return (
    <div>
      <button onClick={() => setText((t) => t + "a")}>digitar</button>
      <span data-testid="typed">{text}</span>
      <ResolvedThumb imageRef={imageRef} placeId={placeId} alt="Serviço 1" className="thumb" />
    </div>
  );
}

describe("miniaturas do editor de serviços do orçamento", () => {
  it("URL enviada pelo usuário aparece no primeiro render, sem flash de Indisponível", () => {
    render(<ResolvedThumb imageRef={UPLOADED} alt="Serviço 1" className="thumb" />);
    const img = screen.getByAltText("Serviço 1") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(UPLOADED);
    expect(screen.queryByText("Indisponível")).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("digitação contínua não remonta a miniatura nem faz a foto desaparecer", async () => {
    render(<TypingHost imageRef={UPLOADED} />);
    const first = screen.getByAltText("Serviço 1");
    const button = screen.getByText("digitar");
    for (let i = 0; i < 5; i++) {
      await act(async () => { button.click(); });
      const img = screen.getByAltText("Serviço 1");
      expect(img.getAttribute("src")).toBe(UPLOADED);
      expect(screen.queryByText("Indisponível")).toBeNull();
      // mesmo nó do DOM => não houve remount
      expect(img).toBe(first);
    }
    expect(screen.getByTestId("typed").textContent).toBe("aaaaa");
  });

  it("foto de hotel: mostra carregamento (nunca Indisponível) e depois a imagem", async () => {
    invoke.mockResolvedValue({
      data: { photos: [{ url: "https://cdn.example/hotel.jpg", thumb_url: "https://cdn.example/t.jpg" }] },
      error: null,
    });
    render(<ResolvedThumb imageRef={makeGplaceRef("PLACE_A", 0)} placeId="PLACE_A" alt="Hotel" className="thumb" />);
    expect(screen.queryByText("Indisponível")).toBeNull();
    await waitFor(() => {
      const img = screen.getByAltText("Hotel") as HTMLImageElement;
      expect(img.getAttribute("src")).toBe("https://cdn.example/hotel.jpg");
    });
    expect(document.body.innerHTML).not.toContain("gplace://");
  });

  it("referência do Google já resolvida na sessão aparece sem nova consulta e sobrevive a re-renders", async () => {
    invoke.mockResolvedValue({
      data: { photos: [{ url: "https://cdn.example/cached.jpg", thumb_url: "https://cdn.example/tc.jpg" }] },
      error: null,
    });
    const ref = makeGplaceRef("PLACE_CACHE", 2);
    const first = render(<ResolvedThumb imageRef={ref} placeId="PLACE_CACHE" alt="Hotel" className="thumb" />);
    await waitFor(() => expect(screen.getByAltText("Hotel")).toBeTruthy());
    const callsAfterFirst = invoke.mock.calls.length;
    first.unmount();

    render(<TypingHost imageRef={ref} placeId="PLACE_CACHE" />);
    // sem primeiro render vazio: já vem do cache da sessão
    const img = screen.getByAltText("Serviço 1") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://cdn.example/cached.jpg");
    expect(screen.queryByText("Indisponível")).toBeNull();

    const button = screen.getByText("digitar");
    await act(async () => { button.click(); });
    expect(screen.getByAltText("Serviço 1")).toBe(img);
    expect(invoke.mock.calls.length).toBe(callsAfterFirst);
  });

  it("mostra Indisponível somente após falha real de resolução", async () => {
    invoke.mockResolvedValue({ data: { photos: [] }, error: null });
    render(<ResolvedThumb imageRef={makeGplaceRef("PLACE_FAIL", 0)} placeId="PLACE_FAIL" alt="Passeio" className="thumb" />);
    await waitFor(() => expect(screen.getByText("Indisponível")).toBeTruthy());
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("photoKeys — identidade estável na lista de fotos", () => {
  const a = "https://s/a.webp";
  const b = "https://s/b.webp";
  const c = "https://s/c.webp";

  it("usa a referência como chave", () => {
    expect(photoKeys([a, b, c])).toEqual([a, b, c]);
  });

  it("mantém a chave de cada foto após remoção", () => {
    const before = photoKeys([a, b, c]);
    const after = photoKeys([a, c]);
    expect(after).toEqual([before[0], before[2]]);
  });

  it("mantém a chave de cada foto após reordenação", () => {
    const before = photoKeys([a, b, c]);
    const after = photoKeys([c, a, b]);
    expect([...after].sort()).toEqual([...before].sort());
    expect(after[0]).toBe(before[2]);

  });

  it("inclusão preserva as chaves anteriores", () => {
    expect(photoKeys([a, b, c])).toEqual([...photoKeys([a, b]), c]);
  });

  it("trata referências duplicadas sem voltar ao índice puro", () => {
    const keys = photoKeys([a, a, b]);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toBe(a);
    expect(keys[1]).toBe(`${a}#2`);
    expect(keys[2]).toBe(b);
  });

  it("lista salva permanece exatamente a mesma (chaves são só de apresentação)", () => {
    const urls = [a, b, a];
    const copy = [...urls];
    photoKeys(urls);
    expect(urls).toEqual(copy);
  });
});
