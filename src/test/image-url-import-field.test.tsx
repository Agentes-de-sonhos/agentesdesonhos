import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { ImageUrlImportField } from "@/components/shared/ImageUrlImportField";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

beforeEach(() => invoke.mockReset());

const forms = readFileSync("src/components/quote/ServiceForms.tsx", "utf-8");

function setup(props: Partial<React.ComponentProps<typeof ImageUrlImportField>> = {}) {
  const onAdd = vi.fn();
  render(
    <ImageUrlImportField existingUrls={[]} onAdd={onAdd} {...props} />,
  );
  return { onAdd };
}

describe("adicionar foto por link da internet (Ingressos)", () => {
  it("abre e fecha o campo inline", () => {
    setup();
    expect(screen.queryByTestId("image-url-import-form")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar link da internet" }));
    expect(screen.getByPlaceholderText("Cole aqui o link direto da imagem")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fechar adição por link" }));
    expect(screen.queryByTestId("image-url-import-form")).toBeNull();
  });

  it("URL válida é importada e adicionada à coleção", async () => {
    invoke.mockResolvedValue({ data: { url: "https://cdn.exemplo.com/import/url-abc.jpg" }, error: null });
    const { onAdd } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar link da internet" }));
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "  https://site.com/foto.jpg  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar foto do link" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("https://cdn.exemplo.com/import/url-abc.jpg"));
    expect(invoke).toHaveBeenCalledWith("import-quote-image", { body: { url: "https://site.com/foto.jpg" } });
    expect(screen.queryByTestId("image-url-import-form")).toBeNull();
  });

  it("URL vazia ou inválida mostra erro e não chama a importação", () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar link da internet" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar foto do link" }));
    expect(screen.getByTestId("image-url-import-error").textContent).toMatch(/http/i);
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "ftp://site/foto.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar foto do link" }));
    expect(screen.getByTestId("image-url-import-error")).toBeTruthy();
    expect(invoke).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("falha da importação mantém o formulário utilizável", async () => {
    invoke.mockResolvedValue({ data: { error: "Link inválido." }, error: null });
    const { onAdd } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar link da internet" }));
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "https://site.com/foto.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar foto do link" }));
    await waitFor(() => expect(screen.getByTestId("image-url-import-error").textContent).toContain("Link inválido."));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByTestId("image-url-import-form")).toBeTruthy();
  });

  it("link já presente na lista é recusado", async () => {
    const { onAdd } = setup({ existingUrls: ["https://site.com/foto.jpg"] });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar link da internet" }));
    fireEvent.change(screen.getByPlaceholderText("Cole aqui o link direto da imagem"), {
      target: { value: "https://site.com/foto.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar foto do link" }));
    expect(screen.getByTestId("image-url-import-error").textContent).toMatch(/já está/);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("limite de fotos desabilita o botão", () => {
    setup({ disabled: true, limitMessage: "Máximo de 5 fotos por serviço." });
    expect((screen.getByRole("button", { name: "Adicionar link da internet" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("integração no formulário de Ingressos", () => {
  it("usa o bloco compartilhado e respeita o limite de fotos", () => {
    expect(forms).toContain('import { ImageUrlImportField } from "@/components/shared/ImageUrlImportField"');
    expect(forms).toContain("<ImageUrlImportField");
    expect(forms).toContain("disabled={!canAddMore}");
  });

  it("preserva as ações existentes de upload e fotos sugeridas", () => {
    expect(forms).toContain('triggerLabel="Buscar fotos sugeridas"');
    expect(forms).toContain('<span className="text-xs">{uploading ? "Otimizando..." : "Adicionar"}</span>');
  });
});
