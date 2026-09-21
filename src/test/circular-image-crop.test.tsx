import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  circularImageStoragePaths,
  MIN_ZOOM,
  clampZoom,
  defaultCropState,
  extensionForMime,
  outputMimeForSource,
  validateCircularImageFile,
  withCacheBuster,
} from "@/lib/circularCrop";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverStub;
if (typeof window !== "undefined" && !(window as any).ResizeObserver) {
  (window as any).ResizeObserver = ResizeObserverStub;
}

vi.mock("react-easy-crop", () => ({
  __esModule: true,
  default: ({ onCropComplete, cropShape, aspect }: any) => (
    <button
      data-testid="fake-cropper"
      data-crop-shape={cropShape}
      data-aspect={String(aspect)}
      onClick={() =>
        onCropComplete?.(
          { x: 0, y: 0, width: 100, height: 100 },
          { x: 10, y: 20, width: 200, height: 200 }
        )
      }
    >
      cropper
    </button>
  ),
}));

import { CircularImageCropDialog } from "@/components/media/CircularImageCropDialog";

describe("circularCrop utils", () => {
  it("aceita apenas JPG, PNG e WebP", () => {
    expect(validateCircularImageFile({ name: "a.png", type: "image/png", size: 10 }).ok).toBe(true);
    const bad = validateCircularImageFile({ name: "a.gif", type: "image/gif", size: 10 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("format");
    expect(ACCEPTED_IMAGE_TYPES).toContain("image/webp");
  });

  it("rejeita arquivos acima do limite", () => {
    const res = validateCircularImageFile({
      name: "a.jpg",
      type: "image/jpeg",
      size: MAX_IMAGE_BYTES + 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("size");
  });

  it("limita o zoom à faixa suportada", () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(4);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
  });

  it("centraliza ao restaurar o enquadramento", () => {
    expect(defaultCropState()).toEqual({ crop: { x: 0, y: 0 }, zoom: 1 });
  });

  it("preserva transparência de PNG/WebP e converte o resto para JPEG", () => {
    expect(outputMimeForSource("image/png")).toBe("image/png");
    expect(outputMimeForSource("image/webp")).toBe("image/webp");
    expect(outputMimeForSource("image/jpeg")).toBe("image/jpeg");
    expect(extensionForMime("image/png")).toBe("png");
  });

  it("mantém caminhos compatíveis por usuário e guarda o original", () => {
    const paths = circularImageStoragePaths({
      userId: "u1",
      kind: "logo",
      outputMime: "image/png",
      originalMime: "image/jpeg",
      timestamp: 123,
    });
    expect(paths.croppedPath).toBe("u1/logo.png");
    expect(paths.originalPath).toBe("u1/originals/logo-123.jpg");

    const avatar = circularImageStoragePaths({
      userId: "u1",
      kind: "avatar",
      outputMime: "image/jpeg",
      originalMime: "image/jpeg",
      timestamp: 5,
    });
    expect(avatar.croppedPath).toBe("u1/avatar.jpg");
  });

  it("não duplica query string no cache buster", () => {
    expect(withCacheBuster("https://x/y.png?t=1", 9)).toBe("https://x/y.png?t=9");
  });
});

describe("CircularImageCropDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setup = (overrides: Partial<React.ComponentProps<typeof CircularImageCropDialog>> = {}) => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const onReplace = vi.fn();
    render(
      <CircularImageCropDialog
        open
        imageSrc="data:image/png;base64,AAA"
        sourceMime="image/png"
        onCancel={onCancel}
        onConfirm={onConfirm}
        onReplace={onReplace}
        {...overrides}
      />
    );
    return { onCancel, onConfirm, onReplace };
  };

  it("usa máscara circular com proporção 1:1", () => {
    setup();
    const cropper = screen.getByTestId("fake-cropper");
    expect(cropper.getAttribute("data-crop-shape")).toBe("round");
    expect(cropper.getAttribute("data-aspect")).toBe("1");
  });

  it("expõe controles acessíveis de zoom, centralizar e troca de imagem", () => {
    setup();
    expect(screen.getByLabelText("Aumentar zoom")).toBeTruthy();
    expect(screen.getByLabelText("Diminuir zoom")).toBeTruthy();
    expect(screen.getByLabelText("Zoom da imagem")).toBeTruthy();
    expect(screen.getByLabelText("Centralizar e restaurar o enquadramento")).toBeTruthy();
    expect(screen.getByLabelText("Trocar imagem")).toBeTruthy();
  });

  it("cancela sem salvar", () => {
    const { onCancel, onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirma somente depois de haver área de recorte e devolve blob quadrado", async () => {
    const { onConfirm } = setup();
    const confirm = screen.getByRole("button", { name: /Salvar|Confirmar/ });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByTestId("fake-cropper"));
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));

    const canvasProto = HTMLCanvasElement.prototype as any;
    canvasProto.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      set fillStyle(_v: string) {},
      set imageSmoothingEnabled(_v: boolean) {},
      set imageSmoothingQuality(_v: string) {},
    }));
    canvasProto.toBlob = vi.fn((cb: (b: Blob) => void, mime: string) =>
      cb(new Blob(["x"], { type: mime }))
    );
    Object.defineProperty(global.Image.prototype, "src", {
      configurable: true,
      set() {
        setTimeout(() => this.dispatchEvent(new Event("load")), 0);
      },
    });

    fireEvent.click(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const [blob, mime] = onConfirm.mock.calls[0];
    expect(mime).toBe("image/png");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("mostra estado de salvamento e bloqueia ações", () => {
    setup({ saving: true });
    expect(screen.getByText("Salvando...")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });
});

describe("integração da foto do agente e do logo da agência", () => {
  const perfil = readFileSync("src/pages/Perfil.tsx", "utf-8");
  const onboarding = readFileSync("src/pages/Onboarding.tsx", "utf-8");

  it("Meu Perfil abre o editor para os dois tipos de imagem", () => {
    expect(perfil).toContain("CircularImageCropDialog");
    expect(perfil).toContain('Ajustar foto do agente');
    expect(perfil).toContain('Ajustar logo da agência');
    expect(perfil).toContain("circularImageStoragePaths");
  });

  it("não reenquadra imagens existentes automaticamente", () => {
    // o editor só abre a partir da seleção de arquivo
    expect(perfil).toContain("handleFileSelected");
    expect(perfil.match(/setCropSource\(\{/g)?.length).toBe(1);
  });

  it("mantém fallback e layout circular quando não há imagem", () => {
    expect(perfil).toContain("AvatarFallback");
    expect(perfil).toContain("rounded-full");
  });

  it("cadastro inicial também usa o editor compartilhado", () => {
    expect(onboarding).toContain("CircularImageCropDialog");
    expect(onboarding).toContain("readImageAsOrientedDataUrl");
  });

  it("o editor é mobile-first (fullscreen com safe area)", () => {
    const dialog = readFileSync("src/components/media/CircularImageCropDialog.tsx", "utf-8");
    expect(dialog).toContain("h-[100dvh]");
    expect(dialog).toContain("env(safe-area-inset-bottom)");
    expect(dialog).toContain("h-11");
  });
});
