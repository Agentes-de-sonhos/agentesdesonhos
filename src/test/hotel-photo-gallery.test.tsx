import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  HotelPhotoGallery,
  HOTEL_GALLERY_SAVED_LABEL,
  HOTEL_GALLERY_SAVING_LABEL,
  HOTEL_GALLERY_RETRY_MESSAGE,
} from "@/components/quote/HotelPhotoGallery";
import { makeGplaceRef } from "@/lib/serviceImages";
import {
  MAX_HOTEL_GALLERY_IMAGES,
  HOTEL_GALLERY_LIMIT_MESSAGE,
  galleryCounterLabel,
  addImageRef,
  removeImageRef,
  dedupeImageRefs,
  normalizeImageRef,
  imageRefOrigin,
  isValidHttpImageUrl,
  dropStaleGoogleRefs,
  isSameImageRefList,
  hasStaleGoogleRefs,
} from "@/lib/quoteHotelGallery";

const invoke = vi.fn();
const upload = vi.fn();
const getPublicUrl = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => upload(...a),
        getPublicUrl: (...a: unknown[]) => getPublicUrl(...a),
      }),
    },
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

const googlePhotos = Array.from({ length: 6 }, (_, i) => ({
  url: `https://cdn.example/full-${i}.jpg`,
  thumb_url: `https://cdn.example/thumb-${i}.jpg`,
  width: 100,
  height: 80,
}));

beforeEach(() => {
  invoke.mockReset();
  upload.mockReset();
  getPublicUrl.mockReset();
  invoke.mockImplementation((fn: unknown) => {
    if (fn === "hotel-photos") return Promise.resolve({ data: { photos: googlePhotos }, error: null });
    return Promise.resolve({ data: { url: "https://cdn.example/imported.jpg" }, error: null });
  });
});

/* ────────── regras puras ────────── */
describe("quoteHotelGallery (regras)", () => {
  it("limite exclusivo de hospedagem é 5 e o contador é exato", () => {
    expect(MAX_HOTEL_GALLERY_IMAGES).toBe(5);
    expect(galleryCounterLabel(3)).toBe("3 de 5 fotos selecionadas");
  });

  it("não trunca silenciosamente ao atingir o limite", () => {
    const ten = Array.from({ length: 5 }, (_, i) => `https://cdn.example/${i}.jpg`);
    const res = addImageRef(ten, "https://cdn.example/nova.jpg");
    expect(res.ok).toBe(false);
    expect(res.urls).toHaveLength(5);
    expect(res.error).toBe(HOTEL_GALLERY_LIMIT_MESSAGE);
  });

  it("bloqueia duplicados normalizando URL", () => {
    const list = ["https://CDN.example/a.jpg/"];
    expect(normalizeImageRef("https://cdn.example/a.jpg")).toBe(normalizeImageRef(list[0]));
    expect(addImageRef(list, "https://cdn.example/a.jpg").ok).toBe(false);
    expect(dedupeImageRefs([...list, "https://cdn.example/a.jpg"])).toHaveLength(1);
  });

  it("remove por referência e identifica as três origens", () => {
    const g = makeGplaceRef("P1", 0);
    expect(removeImageRef([g, "https://x.com/a.jpg"], g)).toEqual(["https://x.com/a.jpg"]);
    expect(imageRefOrigin(g)).toBe("google");
    expect(imageRefOrigin("https://p.supabase.co/storage/v1/object/public/quote-images/u/quotes/a.webp")).toBe("upload");
    expect(
      imageRefOrigin("https://p.supabase.co/storage/v1/object/public/quote-images/u/quotes/url-abc123.jpg"),
    ).toBe("url");
    expect(imageRefOrigin("https://site.com/foto.jpg")).toBe("url");
  });


  it("compara listas e detecta fotos de hotel anterior", () => {
    expect(isSameImageRefList(["https://x.com/a.jpg"], ["https://X.com/a.jpg/"])).toBe(true);
    expect(isSameImageRefList(["https://x.com/a.jpg"], [])).toBe(false);
    expect(hasStaleGoogleRefs([makeGplaceRef("OLD", 0)], "NEW")).toBe(true);
    expect(hasStaleGoogleRefs([makeGplaceRef("NEW", 0), "https://x.com/a.jpg"], "NEW")).toBe(false);
  });
  it("aceita somente http/https em URL manual", () => {
    expect(isValidHttpImageUrl("https://site.com/f.jpg")).toBe(true);
    expect(isValidHttpImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpImageUrl("ftp://site.com/f.jpg")).toBe(false);
    expect(isValidHttpImageUrl("não é url")).toBe(false);
  });

  it("descarta referências Google de um hotel anterior", () => {
    const list = [makeGplaceRef("OLD", 0), makeGplaceRef("NEW", 1), "https://x.com/a.jpg"];
    expect(dropStaleGoogleRefs(list, "NEW")).toEqual([makeGplaceRef("NEW", 1), "https://x.com/a.jpg"]);
  });
});

/* ────────── componente (autosave) ────────── */
/**
 * As sugestões do Google passaram a ser SOB DEMANDA (cada busca é cobrada):
 * é preciso acionar "Buscar fotos do Google" explicitamente.
 */
async function findSuggestions() {
  const btn = screen.queryByText("Buscar fotos do Google");
  if (btn) fireEvent.click(btn);
  return waitFor(() => screen.getByText("Sugestões do Google"));
}

/** Harness controlado: espelha o formulário real (o pai guarda as fotos). */
function Harness({ initial = [], onChange, placeId = "P1" }: { initial?: string[]; onChange?: (u: string[]) => void; placeId?: string | null }) {
  const [urls, setUrls] = useState<string[]>(initial);
  return (
    <HotelPhotoGallery
      imageUrls={urls}
      placeId={placeId}
      hasSavedService
      onImageUrlsChange={(next) => { setUrls(next); onChange?.(next); }}
    />
  );
}

describe("HotelPhotoGallery (autosave)", () => {
  it("usa o título 'Galeria de fotos' e não tem mais botão de salvar/editar", () => {
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId="P1" />);
    expect(screen.getByText("Galeria de fotos")).toBeInTheDocument();
    expect(screen.queryByLabelText("Salvar galeria de fotos")).toBeNull();
    expect(screen.queryByLabelText("Editar galeria de fotos")).toBeNull();
    expect(screen.queryByLabelText("Cancelar edição da galeria")).toBeNull();
  });

  it("nova hospedagem NÃO busca fotos automaticamente: só sob demanda", async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByText("Buscar fotos do Google")).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalledWith("hotel-photos", expect.anything());
    await findSuggestions();
    expect(invoke).toHaveBeenCalledWith("hotel-photos", { body: { place_id: "P1" } });
  });

  it("selecionar uma sugestão salva na hora e mostra 'Salvando…' e depois 'Salvo'", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await findSuggestions();
    fireEvent.click(await screen.findByLabelText("Selecionar foto 1"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([makeGplaceRef("P1", 0)]);
    expect(screen.getByTestId("hotel-gallery-autosave-status").textContent).toBe(HOTEL_GALLERY_SAVING_LABEL);
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-autosave-status").textContent).toBe(HOTEL_GALLERY_SAVED_LABEL),
    );
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1));
  });

  it("desmarcar remove na hora", async () => {
    const onChange = vi.fn();
    render(<Harness initial={["https://cdn.example/salva.jpg"]} onChange={onChange} />);
    fireEvent.click(screen.getAllByLabelText("Remover foto da galeria")[0]);
    expect(onChange).toHaveBeenCalledWith([]);
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(0));
  });

  it("cliques rápidos em várias sugestões não duplicam e preservam a ordem escolhida", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await findSuggestions();
    fireEvent.click(await screen.findByLabelText("Selecionar foto 2"));
    fireEvent.click(await screen.findByLabelText("Selecionar foto 1"));
    let last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
    // Ordem escolhida preservada e sem duplicidade.
    expect(last).toEqual([makeGplaceRef("P1", 1), makeGplaceRef("P1", 0)]);
    expect(dedupeImageRefs(last)).toHaveLength(2);

    // Clicar de novo na mesma sugestão alterna (remove) — nunca duplica.
    fireEvent.click(await screen.findByLabelText("Selecionar foto 2"));
    last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
    expect(last).toEqual([makeGplaceRef("P1", 0)]);
  });

  it("importa URL manual e já conta no limite, sem botão de confirmar", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "https://site.com/quarto.jpg" },
    });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1)),
    );
    expect(invoke).toHaveBeenCalledWith("import-quote-image", { body: { url: "https://site.com/quarto.jpg" } });
    expect(onChange).toHaveBeenCalledWith(["https://cdn.example/imported.jpg"]);
  });

  it("falha de importação mantém o estado visível, não diz 'Salvo' e oferece retry", async () => {
    const onChange = vi.fn();
    invoke.mockImplementation((fn: unknown) =>
      fn === "hotel-photos"
        ? Promise.resolve({ data: { photos: googlePhotos }, error: null })
        : Promise.resolve({ data: null, error: new Error("falhou") }),
    );
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "https://site.com/erro.jpg" },
    });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-feedback").textContent).toContain("Não foi possível carregar"),
    );
    expect(screen.getByTestId("hotel-gallery-autosave-status").textContent).toBe(HOTEL_GALLERY_RETRY_MESSAGE);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(0));

    // Retry real: agora a importação funciona e a foto entra.
    invoke.mockImplementation((fn: unknown) =>
      fn === "hotel-photos"
        ? Promise.resolve({ data: { photos: googlePhotos }, error: null })
        : Promise.resolve({ data: { url: "https://cdn.example/ok.jpg" }, error: null }),
    );
    fireEvent.click(screen.getByTestId("hotel-gallery-retry"));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["https://cdn.example/ok.jpg"]));
  });

  it("rejeita URL inválida e duplicada sem chamar a importação", async () => {
    render(<Harness initial={["https://cdn.example/dup.jpg"]} />);
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    const input = screen.getByPlaceholderText("Cole aqui o link direto da imagem");

    fireEvent.change(input, { target: { value: "ftp://x/a.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    expect(screen.getByTestId("hotel-gallery-feedback").textContent).toContain("link http ou https válido");
    expect(invoke).not.toHaveBeenCalledWith("import-quote-image", expect.anything());

    fireEvent.change(input, { target: { value: "https://cdn.example/dup.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    expect(screen.getByTestId("hotel-gallery-feedback").textContent).toContain("já está na galeria");
    expect(invoke).not.toHaveBeenCalledWith("import-quote-image", expect.anything());
  });

  it("ao atingir 5 fotos desabilita novas adições e mostra a mensagem de limite", async () => {
    const five = Array.from({ length: 5 }, (_, i) => `https://cdn.example/s${i}.jpg`);
    render(<Harness initial={five} />);
    expect(screen.getByTestId("hotel-gallery-limit").textContent).toBe(HOTEL_GALLERY_LIMIT_MESSAGE);
    expect(screen.getByLabelText("Adicionar foto por URL")).toBeDisabled();
    expect(screen.getByLabelText("Enviar foto do computador")).toBeDisabled();
    await findSuggestions();
    expect(await screen.findByLabelText("Selecionar foto 1")).toBeDisabled();
  });

  it("sem hotel e sem fotos, orienta a seleção do hotel", () => {
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId={null} />);
    expect(screen.getByTestId("hotel-gallery-empty")).toBeInTheDocument();
    expect(screen.getByText("Galeria de fotos")).toBeInTheDocument();
  });

  it("trocar de hotel remove automaticamente as fotos do hotel anterior", async () => {
    const onChange = vi.fn();
    const old = makeGplaceRef("OLD", 0);
    function Switcher() {
      const [urls, setUrls] = useState<string[]>([old, "https://x.com/a.jpg"]);
      const [place, setPlace] = useState("OLD");
      return (
        <>
          <button type="button" onClick={() => setPlace("NEW")}>trocar hotel</button>
          <HotelPhotoGallery
            imageUrls={urls}
            placeId={place}
            hasSavedService
            onImageUrlsChange={(next) => { setUrls(next); onChange(next); }}
          />
        </>
      );
    }
    render(<Switcher />);
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(2));
    fireEvent.click(screen.getByText("trocar hotel"));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["https://x.com/a.jpg"]));
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1));
  });

  it("nunca reporta pendência ao formulário (autosave não bloqueia o salvamento)", async () => {
    const onPending = vi.fn();
    render(
      <HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId="P1" hasSavedService onPendingChange={onPending} />,
    );
    expect(onPending).toHaveBeenLastCalledWith(false);
    await findSuggestions();
    fireEvent.click(await screen.findByLabelText("Selecionar foto 1"));
    expect(onPending).not.toHaveBeenCalledWith(true);
  });

  it("após URL importada com sucesso o formulário fecha e limpa", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "https://site.com/quarto.jpg" },
    });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() => expect(screen.queryByTestId("hotel-gallery-url-form")).toBeNull());
    expect(screen.queryByTestId("hotel-gallery-feedback")).toBeNull();
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    expect((screen.getByPlaceholderText("Cole aqui o link direto da imagem") as HTMLInputElement).value).toBe("");
  });
});
