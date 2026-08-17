import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HotelPhotoGallery } from "@/components/quote/HotelPhotoGallery";
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
  it("limite exclusivo de hospedagem é 10 e o contador é exato", () => {
    expect(MAX_HOTEL_GALLERY_IMAGES).toBe(10);
    expect(galleryCounterLabel(3)).toBe("3 de 10 fotos selecionadas");
  });

  it("não trunca silenciosamente ao atingir o limite", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `https://cdn.example/${i}.jpg`);
    const res = addImageRef(ten, "https://cdn.example/nova.jpg");
    expect(res.ok).toBe(false);
    expect(res.urls).toHaveLength(10);
    expect(res.error).toBe(HOTEL_GALLERY_LIMIT_MESSAGE);
  });

  it("bloqueia duplicados normalizando URL", () => {
    const list = ["https://CDN.example/a.jpg/"];
    expect(normalizeImageRef("https://cdn.example/a.jpg")).toBe(normalizeImageRef(list[0]));
    expect(addImageRef(list, "https://cdn.example/a.jpg").ok).toBe(false);
    expect(dedupeImageRefs([...list, "https://cdn.example/a.jpg"])).toHaveLength(1);
  });

  it("remove por referência e identifica a origem", () => {
    const g = makeGplaceRef("P1", 0);
    expect(removeImageRef([g, "https://x.com/a.jpg"], g)).toEqual(["https://x.com/a.jpg"]);
    expect(imageRefOrigin(g)).toBe("google");
    expect(imageRefOrigin("https://p.supabase.co/storage/v1/object/public/quote-images/u/quotes/a.webp")).toBe("upload");
    expect(imageRefOrigin("https://site.com/foto.jpg")).toBe("url");
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

/* ────────── componente ────────── */
async function findSuggestions() {
  return waitFor(() => screen.getByText("Sugestões do Google"));
}

describe("HotelPhotoGallery", () => {
  it("usa o título 'Galeria de fotos'", () => {
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId="P1" />);
    expect(screen.getByText("Galeria de fotos")).toBeInTheDocument();
  });

  it("nova hospedagem abre sugestões ao selecionar o place_id", async () => {
    const { rerender } = render(
      <HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId={null} />,
    );
    rerender(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId="P1" />);
    await findSuggestions();
    expect(screen.getByLabelText("Salvar galeria de fotos")).toBeInTheDocument();
  });

  it("hospedagem existente inicia em visualização, só com as salvas", async () => {
    render(
      <HotelPhotoGallery
        imageUrls={["https://cdn.example/salva.jpg"]}
        onImageUrlsChange={vi.fn()}
        placeId="P1"
        hasSavedService
      />,
    );
    expect(screen.getByLabelText("Editar galeria de fotos")).toBeInTheDocument();
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1));
    expect(screen.queryByText("Sugestões do Google")).toBeNull();
    expect(screen.getByTestId("hotel-gallery-grid").querySelectorAll("img")).toHaveLength(1);
  });

  it("mostra a seção e o botão mesmo com zero fotos quando há hotel", () => {
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId="P1" hasSavedService />);
    expect(screen.getByLabelText("Editar galeria de fotos")).toBeInTheDocument();
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(0));
  });

  it("'Editar galeria' abre sugestões e a seleção não altera as salvas antes de Salvar", async () => {
    const onChange = vi.fn();
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={onChange} placeId="P1" hasSavedService />);
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
    await findSuggestions();
    fireEvent.click(await screen.findByLabelText("Selecionar foto 1"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1));

    fireEvent.click(screen.getByLabelText("Salvar galeria de fotos"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([makeGplaceRef("P1", 0)]);
  });

  it("Cancelar restaura exatamente a versão salva e reabrir não vaza alterações", async () => {
    const onChange = vi.fn();
    render(
      <HotelPhotoGallery imageUrls={["https://cdn.example/salva.jpg"]} onImageUrlsChange={onChange} placeId="P1" hasSavedService />,
    );
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
    await findSuggestions();
    fireEvent.click(await screen.findByLabelText("Selecionar foto 2"));
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(2));
    fireEvent.click(screen.getByLabelText("Cancelar edição da galeria"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1));
    // Reabrir parte novamente das salvas — sem perda nem duplicação.
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1));
    expect(screen.getByTestId("hotel-gallery-grid").querySelectorAll("img")).toHaveLength(1);
  });

  it("remove foto no modo edição sem tocar nas salvas", async () => {
    const onChange = vi.fn();
    render(
      <HotelPhotoGallery imageUrls={["https://cdn.example/salva.jpg"]} onImageUrlsChange={onChange} placeId="P1" hasSavedService />,
    );
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
    fireEvent.click(screen.getAllByLabelText("Remover foto da galeria")[0]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(0));
    fireEvent.click(screen.getByLabelText("Salvar galeria de fotos"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("importa URL manual válida e a conta no limite (Google + URL na mesma galeria)", async () => {
    const onChange = vi.fn();
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={onChange} placeId="P1" hasSavedService />);
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
    await findSuggestions();
    fireEvent.click(await screen.findByLabelText("Selecionar foto 1"));
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    const input = screen.getByPlaceholderText("Cole aqui o link direto da imagem");
    fireEvent.change(input, { target: { value: "https://site.com/quarto.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(2)),
    );
    expect(invoke).toHaveBeenCalledWith("import-quote-image", { body: { url: "https://site.com/quarto.jpg" } });
    fireEvent.click(screen.getByLabelText("Salvar galeria de fotos"));
    expect(onChange).toHaveBeenCalledWith([makeGplaceRef("P1", 0), "https://cdn.example/imported.jpg"]);
  });

  it("rejeita URL inválida, duplicada e falha de importação sem gravar hotlink", async () => {
    render(<HotelPhotoGallery imageUrls={[]} onImageUrlsChange={vi.fn()} placeId="P1" hasSavedService />);
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
    fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    const input = screen.getByPlaceholderText("Cole aqui o link direto da imagem");

    fireEvent.change(input, { target: { value: "ftp://x/a.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    expect(screen.getByTestId("hotel-gallery-feedback").textContent).toContain("link http ou https válido");
    expect(invoke).not.toHaveBeenCalledWith("import-quote-image", expect.anything());

    invoke.mockImplementation((fn: unknown) =>
      fn === "hotel-photos"
        ? Promise.resolve({ data: { photos: googlePhotos }, error: null })
        : Promise.resolve({ data: null, error: new Error("falhou") }),
    );
    fireEvent.change(input, { target: { value: "https://site.com/erro.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-feedback").textContent).toContain("Não foi possível carregar"),
    );
    expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(0));

    // Duplicado
    invoke.mockImplementation((fn: unknown) =>
      fn === "hotel-photos"
        ? Promise.resolve({ data: { photos: googlePhotos }, error: null })
        : Promise.resolve({ data: { url: "https://cdn.example/dup.jpg" }, error: null }),
    );
    fireEvent.change(input, { target: { value: "https://site.com/ok.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-counter").textContent).toBe(galleryCounterLabel(1)),
    );
    if (!screen.queryByTestId("hotel-gallery-url-form")) {
      fireEvent.click(screen.getByLabelText("Adicionar foto por URL"));
    }
    const input2 = await screen.findByPlaceholderText("Cole aqui o link direto da imagem");
    fireEvent.change(input2, { target: { value: "https://cdn.example/dup.jpg" } });
    fireEvent.click(screen.getByLabelText("Adicionar foto"));
    await waitFor(() =>
      expect(screen.getByTestId("hotel-gallery-feedback").textContent).toContain("já está na galeria"),
    );
  });

  it("ao atingir 10 fotos desabilita novas adições e mostra a mensagem de limite", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => `https://cdn.example/s${i}.jpg`);
    render(<HotelPhotoGallery imageUrls={ten} onImageUrlsChange={vi.fn()} placeId="P1" hasSavedService />);
    fireEvent.click(screen.getByLabelText("Editar galeria de fotos"));
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
});
